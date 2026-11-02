import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, UserPlus, UserMinus, Shield, Eye, EyeOff, Activity,
  Loader2, RefreshCw, Trash2, Plus, CheckCircle2, AlertTriangle,
  Building2, BarChart3, History, LogIn, ExternalLink
} from "lucide-react";
import { apiService } from "@/lib/api";
import { useBackendAuth } from "@/hooks/useBackendAuth";

const AgencyDashboard = () => {
  const { user } = useBackendAuth();
  const { toast } = useToast();

  // ── Agency Profile ───────────────────────────────────────────────────────
  const [agency, setAgency] = useState<any>(null);
  const [agencyName, setAgencyName] = useState("");
  const [creatingAgency, setCreatingAgency] = useState(false);

  // ── Roster ───────────────────────────────────────────────────────────────
  const [roster, setRoster] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("view");
  const [addingCreator, setAddingCreator] = useState(false);

  // ── Performance ──────────────────────────────────────────────────────────
  const [performance, setPerformance] = useState<any[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  // ── Audit Log ────────────────────────────────────────────────────────────
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // ── Loading ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgencyProfile();
  }, []);

  const fetchAgencyProfile = async () => {
    setLoading(true);
    try {
      const res = await apiService.request("/agency/profile");
      if (res.data?.agency) {
        setAgency(res.data.agency);
        setAgencyName(res.data.agency.agencyName || "");
        fetchRoster();
        fetchPerformance();
        fetchAuditLog();
      }
    } catch {
      // No agency yet
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgency = async () => {
    if (!agencyName.trim()) {
      toast({ title: "Agency name is required", variant: "destructive" });
      return;
    }
    setCreatingAgency(true);
    try {
      const res = await apiService.request("/agency/profile", {
        method: "POST",
        body: JSON.stringify({ agencyName: agencyName.trim() }),
      });
      if (res.error) throw new Error(res.error);
      toast({ title: "Agency created!", description: `"${agencyName}" is now active.` });
      fetchAgencyProfile();
    } catch (err: any) {
      toast({ title: "Failed to create agency", description: err.message, variant: "destructive" });
    } finally {
      setCreatingAgency(false);
    }
  };

  const fetchRoster = async () => {
    setLoadingRoster(true);
    try {
      const res = await apiService.request("/agency/roster");
      if (res.data?.roster) setRoster(res.data.roster);
    } catch { /* ignore */ }
    finally { setLoadingRoster(false); }
  };

  const handleAddCreator = async () => {
    if (!addEmail.trim()) {
      toast({ title: "Enter creator email", variant: "destructive" });
      return;
    }
    setAddingCreator(true);
    try {
      const res = await apiService.request("/agency/roster/add", {
        method: "POST",
        body: JSON.stringify({ creatorEmail: addEmail.trim(), role: addRole }),
      });
      if (res.error) throw new Error(res.error);
      toast({ title: "Creator added!", description: res.data?.message || "" });
      setAddEmail("");
      fetchRoster();
      fetchAuditLog();
    } catch (err: any) {
      toast({ title: "Failed to add creator", description: err.message, variant: "destructive" });
    } finally {
      setAddingCreator(false);
    }
  };

  const handleRemoveCreator = async (creatorId: string) => {
    if (!confirm("Remove this creator from your roster?")) return;
    try {
      const res = await apiService.request(`/agency/roster/${creatorId}`, { method: "DELETE" });
      if (res.error) throw new Error(res.error);
      toast({ title: "Creator removed" });
      fetchRoster();
      fetchAuditLog();
    } catch (err: any) {
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateRole = async (creatorId: string, role: string) => {
    try {
      const res = await apiService.request(`/agency/roster/${creatorId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      if (res.error) throw new Error(res.error);
      toast({ title: "Role updated", description: `Now set to ${role}` });
      fetchRoster();
      fetchAuditLog();
    } catch (err: any) {
      toast({ title: "Role update failed", description: err.message, variant: "destructive" });
    }
  };

  const handleActAs = async (creatorId: string, creatorName: string) => {
    try {
      const res = await apiService.request(`/agency/act-as/${creatorId}`, { method: "POST" });
      if (res.error) throw new Error(res.error);
      toast({
        title: `Acting as ${creatorName}`,
        description: "Session active for 8 hours. Audit logged.",
      });
      fetchAuditLog();
    } catch (err: any) {
      toast({ title: "Act-as failed", description: err.message, variant: "destructive" });
    }
  };

  const fetchPerformance = async () => {
    setLoadingPerformance(true);
    try {
      const res = await apiService.request("/agency/performance");
      if (res.data?.performance) setPerformance(res.data.performance);
    } catch { /* ignore */ }
    finally { setLoadingPerformance(false); }
  };

  const fetchAuditLog = async () => {
    setLoadingAudit(true);
    try {
      const res = await apiService.request("/agency/audit");
      if (res.data?.logs) setAuditLog(res.data.logs);
    } catch { /* ignore */ }
    finally { setLoadingAudit(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cre8-dark to-black text-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  // ── No Agency — Create Prompt ──────────────────────────────────────────────
  if (!agency) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cre8-dark to-black text-white p-6 md:p-12">
        <div className="max-w-lg mx-auto text-center space-y-6 pt-24">
          <Building2 className="w-20 h-20 mx-auto text-cyan-400 opacity-60" />
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Agency Dashboard
          </h1>
          <p className="text-gray-400">
            Manage creators, view performance, and act on their behalf — all from one place.
          </p>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl text-left">
            <CardHeader>
              <CardTitle className="text-white">Create Your Agency</CardTitle>
              <CardDescription className="text-gray-400">
                One agency per account. You can add creators by email once created.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Agency Name</label>
                <Input
                  placeholder="e.g. Creator Collective Agency"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <Button
                onClick={handleCreateAgency}
                disabled={creatingAgency || !agencyName.trim()}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
              >
                {creatingAgency ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}
                Launch Agency
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cre8-dark to-black text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              {agency.agencyName}
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Multi-tenant agency backend · {roster.length} managed creators
            </p>
          </div>
          <Button
            onClick={() => { fetchRoster(); fetchPerformance(); fetchAuditLog(); }}
            variant="outline"
            size="sm"
            className="border-white/10 text-white hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>

        <Tabs defaultValue="roster" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
            <TabsTrigger value="roster" className="rounded-lg data-[state=active]:bg-cyan-600">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Roster
            </TabsTrigger>
            <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-cyan-600">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Performance
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-lg data-[state=active]:bg-cyan-600">
              <History className="w-3.5 h-3.5 mr-1.5" /> Audit Log
            </TabsTrigger>
          </TabsList>

          {/* ── ROSTER TAB ── */}
          <TabsContent value="roster" className="space-y-6">
            {/* Add Creator */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" /> Add Creator
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Creators must have a Cre8Hub account. They will be linked to your agency.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-gray-300">Creator Email</label>
                    <Input
                      placeholder="creator@example.com"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-xs font-bold text-gray-300">Access Role</label>
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm"
                    >
                      <option value="view" className="bg-gray-900">View Only</option>
                      <option value="act-as" className="bg-gray-900">Act-As</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleAddCreator}
                    disabled={addingCreator}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600"
                  >
                    {addingCreator ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Plus className="w-4 h-4 mr-1" /> Add</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Creator Roster */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Managed Creators</CardTitle>
                <CardDescription className="text-gray-400">
                  {roster.length} creator{roster.length !== 1 ? "s" : ""} linked to this agency.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRoster ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                ) : roster.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Users className="w-14 h-14 mx-auto mb-4 opacity-40" />
                    <p className="text-lg">No creators yet.</p>
                    <p className="text-sm mt-1">Add a creator by email above to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roster.map((c) => (
                      <div key={c.creatorId} className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{c.fullName}</p>
                            <p className="text-xs text-gray-400 truncate">{c.email}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className={`text-[10px] border ${
                                c.agencyRole === "act-as"
                                  ? "border-purple-500/30 text-purple-300"
                                  : "border-gray-500/30 text-gray-400"
                              }`}>
                                {c.agencyRole === "act-as" ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                                {c.agencyRole}
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] border ${
                                c.profileCompleted ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"
                              }`}>
                                {c.profileCompleted ? "Complete" : "Incomplete"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={c.agencyRole}
                            onChange={(e) => handleUpdateRole(c.creatorId, e.target.value)}
                            className="bg-white/5 border border-white/10 text-white rounded-md px-2 py-1 text-xs"
                          >
                            <option value="view" className="bg-gray-900">View</option>
                            <option value="act-as" className="bg-gray-900">Act-As</option>
                          </select>
                          {c.agencyRole === "act-as" && (
                            <Button
                              onClick={() => handleActAs(c.creatorId, c.fullName)}
                              size="sm"
                              variant="outline"
                              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs"
                            >
                              <LogIn className="w-3 h-3 mr-1" /> Act-As
                            </Button>
                          )}
                          <Button
                            onClick={() => handleRemoveCreator(c.creatorId)}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PERFORMANCE TAB ── */}
          <TabsContent value="performance">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Cross-Creator Performance</CardTitle>
                <CardDescription className="text-gray-400">
                  Usage rollup across all managed creators (last 30 days).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPerformance ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                ) : performance.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Activity className="w-14 h-14 mx-auto mb-4 opacity-40" />
                    <p className="text-lg">No usage data yet.</p>
                    <p className="text-sm mt-1">Data appears after creators start using Cre8Hub tools.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Aggregate row */}
                    <div className="bg-cyan-600/10 border border-cyan-500/20 rounded-xl p-4">
                      <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Total (All Creators)</p>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <span className="text-2xl font-extrabold text-white">
                            {performance.reduce((s, p) => s + (p.totalCalls || 0), 0)}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">calls</span>
                        </div>
                        <div>
                          <span className="text-2xl font-extrabold text-white">
                            {performance.reduce((s, p) => s + (p.totalTokens || 0), 0)}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">tokens</span>
                        </div>
                        <div>
                          <span className="text-2xl font-extrabold text-white">{performance.length}</span>
                          <span className="text-xs text-gray-400 ml-1">creators</span>
                        </div>
                      </div>
                    </div>

                    {/* Per-creator breakdown */}
                    {performance.map((p) => (
                      <div key={p.creatorId} className="bg-black/30 border border-white/5 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                          <p className="font-semibold text-white">{p.fullName}</p>
                          <span className="text-xs text-gray-400">{p.totalCalls} calls · {p.totalTokens} tokens</span>
                        </div>
                        {Object.entries(p.services || {}).map(([service, data]: [string, any]) => (
                          <div key={service} className="flex justify-between text-xs text-gray-400 py-1 border-b border-white/5 last:border-0">
                            <span className="capitalize">{service.replace(/_/g, " ")}</span>
                            <span>{data.calls} calls · {data.tokens} tokens</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── AUDIT LOG TAB ── */}
          <TabsContent value="audit">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Agency Audit Trail</CardTitle>
                <CardDescription className="text-gray-400">
                  Every action taken on behalf of a creator is logged here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAudit ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                ) : auditLog.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Shield className="w-14 h-14 mx-auto mb-4 opacity-40" />
                    <p className="text-lg">No audit entries yet.</p>
                    <p className="text-sm mt-1">Actions like adding/removing creators and act-as sessions are recorded here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditLog.map((log) => (
                      <div key={log._id} className="bg-black/30 border border-white/5 rounded-xl p-4 flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Shield className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white capitalize">
                              {log.action.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {log.targetCreatorId && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Target: {log.targetCreatorId.fullName || log.targetCreatorId.email || log.targetCreatorId}
                            </p>
                          )}
                          {log.meta?.role && (
                            <p className="text-xs text-gray-500 mt-0.5">Role: {log.meta.role}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AgencyDashboard;
