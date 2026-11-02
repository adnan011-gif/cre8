import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, Lightbulb, Calendar, CheckSquare, MessageSquare,
  Loader2, ChevronRight, Sparkles, Send, Bot, User,
  RefreshCw, ArrowRight, Check, X, Zap
} from "lucide-react";
import { useBackendAuth } from "@/hooks/useBackendAuth";

const PYTHON_API = import.meta.env.VITE_AI_API_URL || "http://localhost:8000";

type Stage = "idle" | "trending" | "pitching" | "scheduling" | "approving" | "done";

const Cre8Agent = () => {
  const { user } = useBackendAuth();
  const { toast } = useToast();

  // ── Pipeline State ───────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("idle");
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("youtube");
  const [postFreq, setPostFreq] = useState(3);
  const [trends, setTrends] = useState<any[]>([]);
  const [pitches, setPitches] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [approvedIndices, setApprovedIndices] = useState<Set<number>>(new Set());
  const [approvedCalendar, setApprovedCalendar] = useState<any[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);

  // ── Strategy Chat State ──────────────────────────────────────────────────
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const apiCall = async (endpoint: string, body: object) => {
    const res = await fetch(`${PYTHON_API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "API error");
    }
    return res.json();
  };

  // ── Step 1: Trend Research ───────────────────────────────────────────────
  const handleResearchTrends = async () => {
    if (!niche.trim()) {
      toast({ title: "Enter your niche first", variant: "destructive" });
      return;
    }
    setPipelineLoading(true);
    setStage("trending");
    setPipelineProgress(15);
    try {
      const data = await apiCall("/agent/trends", { niche, num_trends: 5, creator_id: user?.id });
      setTrends(data.trends || []);
      setPipelineProgress(30);
      toast({ title: "Trends discovered!", description: `Found ${data.trends?.length} trending topics.` });
    } catch (e: any) {
      toast({ title: "Trend research failed", description: e.message, variant: "destructive" });
    } finally {
      setPipelineLoading(false);
    }
  };

  // ── Step 2: Generate Pitches ─────────────────────────────────────────────
  const handleGeneratePitches = async () => {
    setPipelineLoading(true);
    setStage("pitching");
    setPipelineProgress(45);
    try {
      const data = await apiCall("/agent/pitches", {
        trends,
        creator_persona: { niche, tone: "engaging and educational" },
        platform,
        creator_id: user?.id,
      });
      setPitches(data.pitches || []);
      setPipelineProgress(60);
      toast({ title: "Pitches generated!", description: `${data.pitches?.length} content ideas ready.` });
    } catch (e: any) {
      toast({ title: "Pitch generation failed", description: e.message, variant: "destructive" });
    } finally {
      setPipelineLoading(false);
    }
  };

  // ── Step 3: Build Calendar ───────────────────────────────────────────────
  const handleBuildCalendar = async () => {
    setPipelineLoading(true);
    setStage("scheduling");
    setPipelineProgress(75);
    try {
      const data = await apiCall("/agent/calendar", {
        pitches,
        posting_frequency: postFreq,
        start_date: new Date().toISOString().split("T")[0],
        creator_id: user?.id,
      });
      setCalendar(data.calendar || []);
      setApprovedIndices(new Set(data.calendar?.map((_: any, i: number) => i) ?? []));
      setPipelineProgress(85);
      setStage("approving");
      toast({ title: "Calendar built!", description: "Review and approve slots below." });
    } catch (e: any) {
      toast({ title: "Calendar generation failed", description: e.message, variant: "destructive" });
    } finally {
      setPipelineLoading(false);
    }
  };

  // ── Step 4: Approve Calendar ─────────────────────────────────────────────
  const handleApprove = async () => {
    setPipelineLoading(true);
    setPipelineProgress(95);
    try {
      const data = await apiCall("/agent/approve", {
        calendar,
        approved_indices: Array.from(approvedIndices),
        creator_id: user?.id,
      });
      setApprovedCalendar(data.calendar || []);
      setPipelineProgress(100);
      setStage("done");
      toast({ title: `${data.approved_count} slots approved!`, description: "Your content plan is ready." });
    } catch (e: any) {
      toast({ title: "Approval failed", description: e.message, variant: "destructive" });
    } finally {
      setPipelineLoading(false);
    }
  };

  const toggleApproval = (idx: number) => {
    setApprovedIndices((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleReset = () => {
    setStage("idle");
    setTrends([]);
    setPitches([]);
    setCalendar([]);
    setApprovedCalendar([]);
    setApprovedIndices(new Set());
    setPipelineProgress(0);
  };

  // ── Strategy Chat ─────────────────────────────────────────────────────────
  const handleSendChat = async () => {
    const msg = chatMessage.trim();
    if (!msg) return;
    setChatMessage("");
    setChatLoading(true);
    const updatedHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(updatedHistory);
    try {
      const data = await apiCall("/agent/chat", {
        message: msg,
        history: chatHistory,
        creator_persona: { niche: niche || "content creation", tone: "engaging" },
        creator_id: user?.id,
      });
      setChatHistory([...updatedHistory, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setChatHistory([...updatedHistory, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const stageLabel: Record<Stage, string> = {
    idle: "Ready to start",
    trending: "Researching trends",
    pitching: "Generating pitches",
    scheduling: "Building calendar",
    approving: "Awaiting approval",
    done: "Plan complete",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cre8-dark to-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="border-b border-white/10 pb-6">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Cre8Agent
          </h1>
          <p className="text-gray-400 mt-2">
            Your autonomous AI creator brain — Trend Research → Pitch Ideas → Content Calendar → One-Click Approval
          </p>
        </div>

        {/* Pipeline progress bar */}
        {stage !== "idle" && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>{stageLabel[stage]}</span>
              <span>{pipelineProgress}%</span>
            </div>
            <Progress value={pipelineProgress} className="h-2 bg-white/10" />
          </div>
        )}

        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
            <TabsTrigger value="pipeline" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600">
              <Zap className="w-4 h-4 mr-2" /> Agent Pipeline
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600">
              <MessageSquare className="w-4 h-4 mr-2" /> Strategy Chat
            </TabsTrigger>
          </TabsList>

          {/* ── PIPELINE TAB ── */}
          <TabsContent value="pipeline" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Step sidebar */}
              <div className="lg:col-span-1 space-y-3">
                {[
                  { id: "trending", label: "Trend Research", icon: <TrendingUp className="w-4 h-4" /> },
                  { id: "pitching", label: "Pitch Ideas", icon: <Lightbulb className="w-4 h-4" /> },
                  { id: "scheduling", label: "Content Calendar", icon: <Calendar className="w-4 h-4" /> },
                  { id: "approving", label: "Approval Gate", icon: <CheckSquare className="w-4 h-4" /> },
                ].map((s) => {
                  const stages: Stage[] = ["trending", "pitching", "scheduling", "approving", "done"];
                  const stageIdx = stages.indexOf(stage as Stage);
                  const thisIdx = stages.indexOf(s.id as Stage);
                  const isDone = stageIdx > thisIdx || stage === "done";
                  const isActive = stage === s.id;
                  return (
                    <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isActive ? "border-purple-500 bg-purple-500/10 text-purple-300" :
                      isDone   ? "border-green-500/30 bg-green-500/5 text-green-400" :
                                 "border-white/10 text-gray-500"
                    }`}>
                      {isDone ? <Check className="w-4 h-4 text-green-400" /> : s.icon}
                      <span className="text-sm font-semibold">{s.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Main stage content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Step 1: Setup & Trend Research */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-400" /> Step 1 — Trend Research
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Enter your niche and let the agent pull live trending topics.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="col-span-2 md:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-gray-300">Creator Niche</label>
                        <Input
                          placeholder="e.g. personal finance, gaming, fitness..."
                          value={niche}
                          onChange={(e) => setNiche(e.target.value)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-300">Target Platform</label>
                        <select
                          value={platform}
                          onChange={(e) => setPlatform(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm"
                        >
                          {["youtube", "instagram", "tiktok", "twitter", "linkedin"].map(p => (
                            <option key={p} value={p} className="bg-gray-900">{p.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button
                      onClick={handleResearchTrends}
                      disabled={pipelineLoading}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    >
                      {pipelineLoading && stage === "trending" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Researching...</>
                      ) : (
                        <><TrendingUp className="w-4 h-4 mr-2" /> Research Trends</>
                      )}
                    </Button>

                    {trends.length > 0 && (
                      <div className="space-y-2 mt-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Discovered Trends</p>
                        {trends.map((t, i) => (
                          <div key={i} className="flex items-start gap-3 bg-black/30 border border-white/5 rounded-lg p-3">
                            <span className="text-lg font-extrabold text-purple-400 min-w-[28px]">#{i + 1}</span>
                            <div>
                              <p className="font-semibold text-white">{t.keyword}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{t.reason}</p>
                            </div>
                            <span className="ml-auto text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full">
                              Score {t.score}
                            </span>
                          </div>
                        ))}
                        <Button
                          onClick={handleGeneratePitches}
                          disabled={pipelineLoading}
                          className="w-full mt-2 bg-gradient-to-r from-violet-600 to-pink-600"
                        >
                          {pipelineLoading && stage === "pitching" ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating pitches...</>
                          ) : (
                            <><Lightbulb className="w-4 h-4 mr-2" /> Generate Content Pitches <ArrowRight className="w-4 h-4 ml-2" /></>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 2: Pitches */}
                {pitches.length > 0 && (
                  <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-400" /> Step 2 — Content Pitches
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        AI-crafted ideas with hooks, formats, and reach estimates.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pitches.map((p, i) => (
                        <div key={i} className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-white leading-tight">{p.title}</h3>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                              p.estimated_reach === "High" ? "bg-green-500/20 text-green-400" :
                              p.estimated_reach === "Medium" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-gray-500/20 text-gray-400"
                            }`}>
                              {p.estimated_reach} Reach
                            </span>
                          </div>
                          <p className="text-sm text-purple-300 italic">"{p.hook}"</p>
                          <div className="flex gap-4 text-xs text-gray-400">
                            <span>📹 {p.format}</span>
                            <span>💬 {p.cta}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-3">
                        <div className="space-y-1 flex-1">
                          <label className="text-xs font-bold text-gray-300">Posts per week</label>
                          <Input
                            type="number"
                            min={1}
                            max={7}
                            value={postFreq}
                            onChange={(e) => setPostFreq(Number(e.target.value))}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        <Button
                          onClick={handleBuildCalendar}
                          disabled={pipelineLoading}
                          className="self-end bg-gradient-to-r from-violet-600 to-pink-600"
                        >
                          {pipelineLoading && stage === "scheduling" ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building...</>
                          ) : (
                            <><Calendar className="w-4 h-4 mr-2" /> Build Calendar</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 3 & 4: Calendar + Approval Gate */}
                {(stage === "approving" || stage === "done") && calendar.length > 0 && (
                  <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-green-400" />
                        {stage === "done" ? "Approved Content Plan" : "Step 3 — One-Click Approval Gate"}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {stage === "done"
                          ? "These slots are ready to execute. Green = approved, red = rejected."
                          : "Review each slot. Uncheck any you don't want to schedule, then approve."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(stage === "done" ? approvedCalendar : calendar).map((slot, i) => (
                        <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                          stage === "done"
                            ? slot.status === "approved" ? "border-green-500/30 bg-green-500/5" : "border-red-500/20 bg-red-500/5 opacity-50"
                            : approvedIndices.has(i) ? "border-purple-500/30 bg-purple-500/5" : "border-white/5 bg-black/20 opacity-50"
                        }`}>
                          {stage !== "done" && (
                            <Checkbox
                              checked={approvedIndices.has(i)}
                              onCheckedChange={() => toggleApproval(i)}
                              className="mt-0.5 border-white/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                            />
                          )}
                          {stage === "done" && (
                            slot.status === "approved"
                              ? <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                              : <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-3 items-center">
                              <span className="text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">
                                {slot.date} · {slot.day}
                              </span>
                              <span className="text-xs text-gray-500">{slot.pitch?.format}</span>
                            </div>
                            <p className="font-semibold text-white mt-1.5 leading-tight">{slot.pitch?.title}</p>
                            <p className="text-xs text-gray-400 mt-1 italic">"{slot.pitch?.hook}"</p>
                          </div>
                        </div>
                      ))}

                      {stage === "approving" && (
                        <div className="flex gap-3 pt-2">
                          <Button
                            onClick={() => setApprovedIndices(new Set(calendar.map((_, i) => i)))}
                            variant="outline"
                            size="sm"
                            className="border-white/10 text-white hover:bg-white/5"
                          >
                            Select All
                          </Button>
                          <Button
                            onClick={handleApprove}
                            disabled={pipelineLoading || approvedIndices.size === 0}
                            className="bg-gradient-to-r from-green-600 to-emerald-600"
                          >
                            {pipelineLoading ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving...</>
                            ) : (
                              <><CheckSquare className="w-4 h-4 mr-2" /> Approve {approvedIndices.size} Slots</>
                            )}
                          </Button>
                        </div>
                      )}

                      {stage === "done" && (
                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="border-white/10 text-white hover:bg-white/5 mt-2"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" /> Start New Pipeline
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── STRATEGY CHAT TAB ── */}
          <TabsContent value="chat">
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-400" /> Strategy Advisor
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Ask anything about content strategy, platform growth, monetization, or scheduling.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Chat history */}
                <div className="min-h-[400px] max-h-[500px] overflow-y-auto space-y-4 pr-2">
                  {chatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Bot className="w-14 h-14 mb-4 opacity-40 text-purple-400" />
                      <p className="text-sm">Start chatting with your AI strategy advisor.</p>
                      <div className="mt-4 grid grid-cols-1 gap-2 w-full max-w-md">
                        {[
                          "How do I grow my YouTube channel faster?",
                          "What's the best posting schedule for Instagram?",
                          "How can I monetize my content?",
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => setChatMessage(q)}
                            className="text-xs text-left border border-white/10 rounded-lg px-3 py-2 hover:bg-white/5 transition text-gray-300"
                          >
                            <Sparkles className="w-3 h-3 inline mr-1.5 text-purple-400" />
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-purple-400" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-purple-600/20 text-white border border-purple-500/20 rounded-tr-sm"
                            : "bg-white/5 text-gray-200 border border-white/10 rounded-tl-sm"
                        }`}>
                          {msg.content}
                        </div>
                        {msg.role === "user" && (
                          <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-blue-400" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat input */}
                <div className="flex gap-3 pt-2 border-t border-white/10">
                  <Textarea
                    placeholder="Ask your AI advisor anything..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    className="flex-1 bg-white/5 border-white/10 text-white min-h-[48px] max-h-[120px] resize-none"
                  />
                  <Button
                    onClick={handleSendChat}
                    disabled={chatLoading || !chatMessage.trim()}
                    className="self-end bg-purple-600 hover:bg-purple-700 px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Cre8Agent;
