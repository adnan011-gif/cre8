import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlatformCard } from "./PlatformCard";
import { Youtube, Instagram, Twitter, Linkedin, Send, Paperclip, StopCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useBackendAuth } from "@/hooks/useBackendAuth";
import { apiService, parseApiError } from "@/lib/api";

// ── Port constants ──────────────────────────────────────────────────────────
// Python AI Workflow (FastAPI) — content generation & streaming
const PYTHON_API = import.meta.env.VITE_AI_API_URL || "http://localhost:8000";
// Node.js Backend — auth, profiles, saving outputs to MongoDB
// Uses apiService (reads VITE_API_URL) — no raw port needed here

const platforms = [
  {
    id: "youtube",
    title: "YouTube",
    description: "Long-form video content",
    icon: <Youtube className="w-10 h-10" />,
  },
  {
    id: "instagram",
    title: "Instagram",
    description: "Visual storytelling with engaging captions",
    icon: <Instagram className="w-full h-full" />,
  },
  {
    id: "twitter",
    title: "Twitter",
    description: "Concise, viral-worthy posts and threads",
    icon: <Twitter className="w-full h-full" />,
  },
  {
    id: "linkedin",
    title: "LinkedIn",
    description: "Professional insights and thought leadership",
    icon: <Linkedin className="w-full h-full text-cre8-purple" />,
  },
];

export function ContentGenerator() {
  const { user } = useBackendAuth();

  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showTranscriptRequest, setShowTranscriptRequest] = useState(false);
  const [savedOutputs, setSavedOutputs] = useState([]);

  // Streaming states
  const [streamingContent, setStreamingContent] = useState("");
  const [currentIteration, setCurrentIteration] = useState(0);
  const [maxIterations, setMaxIterations] = useState(3);
  const [streamingStatus, setStreamingStatus] = useState("");
  const [critiques, setCritiques] = useState([]);
  const [progress, setProgress] = useState(0);

  // Ref to abort streaming
  const abortControllerRef = useRef(null);

  /**
   * Save generated content to MongoDB via the Node.js backend.
   * The Python service's /save_output is intentionally NOT called here —
   * it only logs to stdout and does nothing persistent.
   */
  const handleSave = async (output) => {
    try {
      const result = await apiService.addPastOutput({
        title: output.title,
        type: output.type,
        description: output.description ?? "",
        content: output.content,
        platform: output.platform,
      });

      if (result.error) {
        setError(`Failed to save: ${result.error}`);
        return;
      }

      setSavedOutputs((prev) => [...prev, output]);
      setResult(null);
      console.log("Content saved to MongoDB successfully");
    } catch (err) {
      console.error("Error saving output:", err);
      setError(`Save error: ${err.message}`);
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setStreaming(false);
    setStreamingStatus("Stopped by user");
  };

  const resetStreamingState = () => {
    setStreamingContent("");
    setCurrentIteration(0);
    setStreamingStatus("");
    setCritiques([]);
    setProgress(0);
    setError("");
    setResult(null);
  };

  const handleStreamingGenerate = async () => {
    if (!selectedPlatform || !prompt.trim()) {
      setError("Please select a platform and enter a prompt");
      return;
    }

    setLoading(true);
    setStreaming(true);
    resetStreamingState();

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      console.log("Starting streaming generation...");

      const requestBody = {
        platform: selectedPlatform,
        prompt: prompt.trim(),
        personify: showTranscriptRequest,
        iterations: 3,
        // Pass the user's saved persona so the AI uses their voice.
        // Falls back to the static responses.json persona on the Python side
        // if this is null/undefined.
        persona: user?.persona ?? null,
      };

      // FIXED: correct port is 7000 (Python FastAPI), not 6969
      const response = await fetch(`${PYTHON_API}/generate-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain",
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                setError(data.error);
                setLoading(false);
                setStreaming(false);
                return;
              }

              // Handle different message types
              if (data.status) {
                switch (data.status) {
                  case "starting":
                    setStreamingStatus("Starting content generation...");
                    setProgress(10);
                    break;
                  case "generating":
                    setStreamingStatus(
                      `Generating content (Iteration ${data.iteration}/${data.max_iterations})`
                    );
                    setCurrentIteration(data.iteration);
                    setMaxIterations(data.max_iterations);
                    setProgress(20 + (data.iteration / data.max_iterations) * 30);
                    break;
                  case "content_streaming":
                    setStreamingStatus("Streaming content...");
                    setProgress(50);
                    break;
                  case "critiquing":
                    setStreamingStatus("Getting feedback from AI critic...");
                    setProgress(70);
                    break;
                  case "improving":
                    setStreamingStatus("Improving content based on feedback...");
                    setProgress(40);
                    break;
                  case "approved":
                    setStreamingStatus(
                      `Content approved after ${data.iterations} iterations! ✅`
                    );
                    setProgress(100);
                    break;
                }
              }

              // Handle streaming content tokens
              if (data.type === "content_token") {
                setStreamingContent((prev) => prev + data.token);
              }

              // Handle complete content
              if (data.type === "content_complete") {
                setStreamingContent(data.content);
                setProgress(60);
              }

              // Handle critiques
              if (data.type === "critique") {
                setCritiques((prev) => [
                  ...prev,
                  { iteration: data.iteration, critique: data.critique },
                ]);
                setProgress(75);
              }

              // Handle final result
              if (data.type === "final_result") {
                setResult(data.content);
                setStreamingStatus(
                  data.status === "APPROVED"
                    ? `✅ Content approved after ${data.iterations} iterations!`
                    : `⚠️ Max iterations reached (${data.iterations}). Content may need refinement.`
                );
                setProgress(100);
                setLoading(false);
                setStreaming(false);
              }
            } catch (e) {
              console.error("Error parsing streaming data:", e);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setStreamingStatus("Generation cancelled");
      } else {
        console.error("Error in streaming generation:", err);
        setError(`Streaming failed: ${err.message}`);
      }
      setLoading(false);
      setStreaming(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
          Hey! {user?.name ? user.name.split(" ")[0] : "Content Creator"}
        </h1>
        <p className="text-xl text-muted-foreground">
          What platform can I help you create content for?
        </p>
      </div>

      {/* Platform Selection */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {platforms.map((platform) => (
          <PlatformCard
            key={platform.id}
            platform={platform.id as "youtube" | "instagram" | "twitter" | "linkedin"}
            title={platform.title}
            description={platform.description}
            onSelect={() => {
              setSelectedPlatform(platform.id);
              setError("");
            }}
            setShowTranscriptRequest={setShowTranscriptRequest}
            showTranscriptRequest={showTranscriptRequest}
          />
        ))}
      </div>

      {/* Selected Platform Display */}
      {selectedPlatform && (
        <div className="text-center p-4 bg-gray-800/50 rounded-lg">
          <p className="text-lg text-gray-200">
            Selected Platform:{" "}
            <span className="font-bold capitalize text-white">{selectedPlatform}</span>
          </p>
        </div>
      )}

      {/* Persona Notice */}
      {selectedPlatform && user?.persona && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-500/30 rounded-lg text-sm text-blue-300">
          <span>🎭</span>
          <span>
            Generating in your persona voice
            {user.persona.creator_name ? ` — ${user.persona.creator_name}` : ""}
          </span>
        </div>
      )}

      {/* Content Input */}
      {selectedPlatform && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className="relative">
            <Textarea
              placeholder="Describe the content you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] bg-white/20 backdrop-blur-md rounded-2xl resize-none text-gray-100 placeholder:text-white/40 transition-all duration-300"
              disabled={loading}
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="bg-gray-800 rounded-full hover:bg-white hover:text-black"
                disabled={loading}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Attach file
              </Button>
              {!loading ? (
                <Button
                  onClick={handleStreamingGenerate}
                  disabled={!prompt.trim() || !selectedPlatform}
                  className="bg-gray-800 rounded-full hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              ) : (
                <Button
                  onClick={stopStreaming}
                  className="bg-red-600 rounded-full hover:bg-red-700 text-white transition-all duration-300"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200">
              <p className="font-medium">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Streaming Status */}
          {loading && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-300 font-medium">{streamingStatus}</p>
                  <span className="text-sm text-gray-400">
                    {currentIteration > 0 && `${currentIteration}/${maxIterations}`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Streaming Content Display */}
          {streaming && streamingContent && (
            <div className="mt-6 p-4 bg-gray-800 text-gray-100 rounded-xl shadow">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg text-white">Content Being Generated...</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live</span>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-4">
                <pre className="whitespace-pre-wrap font-sans text-gray-100 leading-relaxed">
                  {streamingContent}
                  {streaming && <span className="animate-pulse text-blue-400">|</span>}
                </pre>
              </div>
            </div>
          )}

          {/* Critiques Display */}
          {critiques.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-bold text-white">AI Feedback:</h4>
              {critiques.map((critique, index) => (
                <div
                  key={index}
                  className="p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg"
                >
                  <p className="text-sm text-yellow-400 font-medium mb-1">
                    Iteration {critique.iteration} Feedback:
                  </p>
                  <p className="text-yellow-200 text-sm">{critique.critique}</p>
                </div>
              ))}
            </div>
          )}

          {/* Final Results Display */}
          {result && !streaming && (
            <div className="mt-6 p-4 bg-gray-800 text-gray-100 rounded-xl shadow border-l-4 border-green-500">
              <h4 className="font-bold text-lg text-white">{result.title}</h4>
              <p className="text-sm text-gray-400 mb-2">
                {result.type?.replace("_", " ").toUpperCase()} •{" "}
                {result.platform?.toUpperCase()}
              </p>

              {result.description && (
                <p className="mb-3 text-gray-300 text-sm">{result.description}</p>
              )}

              <div className="border-t border-gray-600 pt-4 mt-4 prose prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-xl font-semibold mt-3 mb-1" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="text-gray-200 mb-2 leading-relaxed" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="list-disc ml-6 text-gray-200" {...props} />
                    ),
                    code: ({
                      node,
                      inline = false,
                      ...props
                    }: {
                      node: any;
                      inline?: boolean;
                      [key: string]: any;
                    }) =>
                      inline ? (
                        <code className="bg-gray-800 px-1 rounded text-pink-400" {...props} />
                      ) : (
                        <pre className="bg-gray-900 p-3 rounded-lg overflow-x-auto">
                          <code {...props} />
                        </pre>
                      ),
                  }}
                >
                  {result.content}
                </ReactMarkdown>
              </div>

              {/* Save + Discard Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-600">
                <Button
                  onClick={() => handleSave(result)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Save Content
                </Button>
                <Button
                  onClick={() => setResult(null)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleStreamingGenerate}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          {/* Saved Outputs Display */}
          {savedOutputs.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-white mb-4">Saved Content</h3>
              <div className="space-y-3">
                {savedOutputs.map((output, index) => (
                  <div key={index} className="p-3 bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-white">{output.title}</h4>
                    <p className="text-sm text-gray-300">
                      {output.platform} • {output.type}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}