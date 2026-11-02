import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  Sparkles, Image as ImageIcon, Video, Scissors, Download, Save, 
  RefreshCw, Volume2, VolumeX, Eye, Check, Loader2, Upload, 
  AlertCircle, LayoutGrid, FileVideo, PlusCircle
} from "lucide-react";
import { apiService, parseApiError } from "@/lib/api";
import { useBackendAuth } from "@/hooks/useBackendAuth";

// Python FastAPI backend
const PYTHON_API = import.meta.env.VITE_AI_API_URL || "http://localhost:8000";

const Cre8Studio = () => {
  const { user } = useBackendAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("canvas");

  // ── Canvas States ────────────────────────────────────────────────────────
  const [canvasPrompt, setCanvasPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "1:1" | "9:16">("16:9");
  const [purpose, setPurpose] = useState<"thumbnail" | "poster" | "post" | "ad_creative">("thumbnail");
  const [generatingCanvas, setGeneratingCanvas] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [canvasReferenceFile, setCanvasReferenceFile] = useState<File | null>(null);
  const [textFields, setTextFields] = useState({
    brand_name: "",
    headline: "",
    pricing: "",
    features: [] as string[],
    cta: "",
  });
  const [newFeature, setNewFeature] = useState("");

  // ── Shorts States ────────────────────────────────────────────────────────
  const [shortMode, setShortMode] = useState<"script" | "prompt">("script");
  const [shortScript, setShortScript] = useState("");
  const [shortTitle, setShortTitle] = useState("");
  const [voiceMode, setVoiceMode] = useState<"voiced" | "silent">("voiced");
  const [outputTag, setOutputTag] = useState<"organic" | "ad">("organic");
  const [generatingShort, setGeneratingShort] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<any>(null);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [videoReferenceFile, setVideoReferenceFile] = useState<File | null>(null);

  // ── Clipper States ───────────────────────────────────────────────────────
  const [clipperFile, setClipperFile] = useState<File | null>(null);
  const [clippingProgress, setClippingProgress] = useState(0);
  const [generatingClips, setGeneratingClips] = useState(false);
  const [generatedClips, setGeneratedClips] = useState<any[]>([]);

  // ── Asset Library States ─────────────────────────────────────────────────
  const [savedAssets, setSavedAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoadingAssets(true);
    try {
      const res = await apiService.getAssets({ hub: "studio" });
      if (res.data && res.data.assets) {
        setSavedAssets(res.data.assets);
      }
    } catch (err) {
      console.error("Failed to load assets", err);
    } finally {
      setLoadingAssets(false);
    }
  };

  // ── Actions: Canvas ──────────────────────────────────────────────────────
  const handleGenerateCanvas = async () => {
    if (!canvasPrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a descriptive prompt for the design.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingCanvas(true);
    try {
      const fd = new FormData();
      fd.append("prompt", canvasPrompt);
      fd.append("aspect_ratio", aspectRatio);
      fd.append("purpose", purpose);
      fd.append("num_images", "4");
      fd.append("creator_id", user?.id || "default");
      if (canvasReferenceFile) {
        fd.append("reference_image", canvasReferenceFile);
      }
      const hasAnyText = textFields.brand_name || textFields.headline || textFields.pricing || textFields.features.length > 0 || textFields.cta;
      if (hasAnyText) {
        fd.append("text_fields", JSON.stringify(textFields));
      }

      const response = await fetch(`${PYTHON_API}/studio/generate`, {
        method: "POST",
        body: fd,
      });

      if (!response.ok) throw new Error(await parseApiError(response));
      const result = await response.json();
      setGeneratedImages(result.images || []);
      toast({
        title: "Visuals Generated!",
        description: `Created 4 designs optimized for ${purpose}.`
      });
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingCanvas(false);
    }
  };

  const handleSaveCanvasAsset = async (img: any) => {
    try {
      const res = await apiService.saveAsset({
        type: purpose === "ad_creative" ? "ad_creative" : (purpose === "thumbnail" ? "thumbnail" : (purpose === "poster" ? "poster" : "image")),
        hub: "studio",
        title: `${purpose.toUpperCase()} - ${canvasPrompt.slice(0, 30)}`,
        description: canvasPrompt,
        url: `${PYTHON_API}${img.url}`,
        metadata: {
          aspect_ratio: img.aspect_ratio,
          purpose: img.purpose,
          filename: img.filename
        }
      });

      if (res.error) throw new Error(res.error);

      toast({
        title: "Saved to Library",
        description: "Asset saved to your library successfully."
      });
      fetchAssets();
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // ── Actions: Shorts ──────────────────────────────────────────────────────
  const handleGenerateShort = async () => {
    if (!shortScript.trim()) {
      toast({
        title: "Script required",
        description: "Please type or paste a script to generate a video.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingShort(true);
    try {
      const response = await fetch(`${PYTHON_API}/studio/short`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: shortScript,
          title: shortTitle || "Cre8Hub Short",
          voice_mode: voiceMode,
          output_tag: outputTag,
          creator_id: user?.id || "default"
        })
      });

      if (!response.ok) throw new Error(await parseApiError(response));
      const result = await response.json();
      setGeneratedVideo(result);
      toast({
        title: "Short Completed!",
        description: "Your vertical short has been compiled and is ready."
      });
    } catch (err: any) {
      toast({
        title: "Short creation failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingShort(false);
    }
  };

  // ── Actions: Video (Prompt mode) ───────────────────────────────────────────
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the video you want to generate.",
        variant: "destructive"
      });
      return;
    }

    setGeneratingShort(true);
    try {
      const fd = new FormData();
      fd.append("prompt", videoPrompt);
      fd.append("duration", String(videoDuration));
      fd.append("aspect_ratio", videoAspectRatio);
      fd.append("creator_id", user?.id || "default");
      if (videoReferenceFile) {
        fd.append("reference_image", videoReferenceFile);
      }

      const response = await fetch(`${PYTHON_API}/studio/video`, {
        method: "POST",
        body: fd,
      });

      if (!response.ok) throw new Error(await parseApiError(response));
      const result = await response.json();
      setGeneratedVideo(result);
      toast({
        title: "Video Generated!",
        description: `AI video created (${videoDuration}s, ${videoAspectRatio}).`
      });
    } catch (err: any) {
      toast({
        title: "Video generation failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingShort(false);
    }
  };

  const handleSaveVideoAsset = async () => {
    if (!generatedVideo) return;
    try {
      const res = await apiService.saveAsset({
        type: "short",
        hub: "studio",
        title: shortTitle || "Cre8Hub Short",
        description: (videoPrompt || shortScript).slice(0, 100),
        url: `${PYTHON_API}${generatedVideo.url}`,
        metadata: {
          duration_seconds: generatedVideo.duration_seconds,
          voice_mode: generatedVideo.voice_mode,
          output_tag: generatedVideo.output_tag,
          filename: generatedVideo.filename
        }
      });

      if (res.error) throw new Error(res.error);

      toast({
        title: "Saved to Library",
        description: "Video asset saved to your library."
      });
      fetchAssets();
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // ── Actions: Clipper ─────────────────────────────────────────────────────
  const handleClipperUpload = async () => {
    if (!clipperFile) return;

    setGeneratingClips(true);
    setClippingProgress(10);
    
    // Simulate upload/clipping progress steps
    const interval = setInterval(() => {
      setClippingProgress((p) => (p < 85 ? p + 8 : p));
    }, 1500);

    try {
      const formData = new FormData();
      formData.append("file", clipperFile);
      formData.append("creator_id", user?.id || "default");
      formData.append("max_clips", "3");

      const response = await fetch(`${PYTHON_API}/studio/clip`, {
        method: "POST",
        body: formData
      });

      clearInterval(interval);
      setClippingProgress(100);

      if (!response.ok) throw new Error(await parseApiError(response));
      const result = await response.json();
      const valid = (result.clips || []).filter((c: any) => c.url);
      setGeneratedClips(valid);
      toast({
        title: "AI Clipping Complete!",
        description: `Successfully extracted and edited ${valid.length} high-energy shorts.`
      });
    } catch (err: any) {
      clearInterval(interval);
      toast({
        title: "Clipping failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setGeneratingClips(false);
    }
  };

  const handleSaveClipAsset = async (clip: any, index: number) => {
    if (!clip.url) {
      toast({ title: "Cannot save", description: "Clip URL is missing.", variant: "destructive" });
      return;
    }
    try {
      const res = await apiService.saveAsset({
        type: "clip",
        hub: "studio",
        title: `AI Clip #${index + 1} - ${clip.caption || 'Highlight'}`,
        description: clip.reason || "AI clipped highlight from raw footage",
        url: `${PYTHON_API}${clip.url}`,
        metadata: {
          start: clip.start,
          end: clip.end,
          caption: clip.caption,
          filename: clip.filename
        }
      });

      if (res.error) throw new Error(res.error);

      toast({
        title: "Clip Saved",
        description: "Video clip saved to your asset library."
      });
      fetchAssets();
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cre8-dark to-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Cre8Studio
            </h1>
            <p className="text-gray-400 mt-2">
              Your unified workspace for creating thumbnails, social posts, posters, and short-form videos.
            </p>
          </div>
        </div>

        {/* Core Workspace Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 bg-white/5 border border-white/10 p-1 rounded-xl max-w-lg">
            <TabsTrigger value="canvas" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600">
              <ImageIcon className="w-4 h-4 mr-2" />
              Canvas
            </TabsTrigger>
            <TabsTrigger value="shorts" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600">
              <Video className="w-4 h-4 mr-2" />
              Shorts
            </TabsTrigger>
            <TabsTrigger value="clipper" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600">
              <Scissors className="w-4 h-4 mr-2" />
              Clipper
            </TabsTrigger>
          </TabsList>

          {/* 🎨 Canvas Tab Content */}
          <TabsContent value="canvas">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Controls */}
              <Card className="lg:col-span-1 bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Design Settings</CardTitle>
                  <CardDescription className="text-gray-400">Configure your image details and purpose.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Aspect Ratio Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">Aspect Ratio</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Thumbnail (16:9)", value: "16:9" },
                        { label: "Square (1:1)", value: "1:1" },
                        { label: "Vertical (9:16)", value: "9:16" }
                      ].map((r) => (
                        <button
                          key={r.value}
                          onClick={() => setAspectRatio(r.value as any)}
                          className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                            aspectRatio === r.value 
                              ? "bg-blue-600/20 border-blue-500 text-white" 
                              : "border-white/10 text-gray-400 hover:bg-white/5"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Purpose Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">Design Purpose</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "YouTube Thumbnail", value: "thumbnail" },
                        { label: "Social Post", value: "post" },
                        { label: "Business Poster", value: "poster" },
                        { label: "Ad Creative", value: "ad_creative" }
                      ].map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setPurpose(p.value as any)}
                          className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                            purpose === p.value 
                              ? "bg-purple-600/20 border-purple-500 text-white" 
                              : "border-white/10 text-gray-400 hover:bg-white/5"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Box */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">Visual Prompt</label>
                    <Textarea
                      placeholder="Describe the image you want to generate. Be specific about style, colors, and layout..."
                      value={canvasPrompt}
                      onChange={(e) => setCanvasPrompt(e.target.value)}
                      className="bg-white/5 border-white/10 text-white h-32 focus:border-blue-500"
                    />
                  </div>

                  {/* Reference Image Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">Reference Image (optional)</label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-white/20 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all">
                        <Upload className="w-4 h-4" />
                        {canvasReferenceFile ? "Change image" : "Upload reference"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setCanvasReferenceFile(file);
                          }}
                        />
                      </label>
                      {canvasReferenceFile && (
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-md overflow-hidden border border-white/10 flex-shrink-0">
                            <img
                              src={URL.createObjectURL(canvasReferenceFile)}
                              alt="Reference"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-xs text-gray-400 truncate max-w-[100px]">
                            {canvasReferenceFile.name}
                          </span>
                          <button
                            onClick={() => setCanvasReferenceFile(null)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Structured Text Fields */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-300">Text on Image (optional)</label>
                    <div className="text-[10px] text-gray-500 mb-1">
                      Fill in what you want — each field is auto-sized and placed based on the image.
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500">Brand Name</label>
                      <input
                        placeholder="e.g. Nike"
                        value={textFields.brand_name}
                        onChange={(e) => setTextFields({ ...textFields, brand_name: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500">Headline / Title</label>
                      <input
                        placeholder="e.g. Just Do It"
                        value={textFields.headline}
                        onChange={(e) => setTextFields({ ...textFields, headline: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500">Pricing</label>
                      <input
                        placeholder="e.g. $49.99"
                        value={textFields.pricing}
                        onChange={(e) => setTextFields({ ...textFields, pricing: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500">Features / Bullet Points</label>
                      <div className="space-y-1">
                        {textFields.features.map((feat, i) => (
                          <div key={i} className="flex gap-1">
                            <input
                              value={feat}
                              onChange={(e) => {
                                const copy = [...textFields.features];
                                copy[i] = e.target.value;
                                setTextFields({ ...textFields, features: copy });
                              }}
                              className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white outline-none"
                            />
                            <button
                              onClick={() => setTextFields({ ...textFields, features: textFields.features.filter((_, j) => j !== i) })}
                              className="text-red-400 hover:text-red-300 text-xs px-1"
                            >
                              x
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-1">
                          <input
                            placeholder="Add a feature"
                            value={newFeature}
                            onChange={(e) => setNewFeature(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newFeature.trim()) {
                                setTextFields({ ...textFields, features: [...textFields.features, newFeature.trim()] });
                                setNewFeature("");
                              }
                            }}
                            className="flex-1 px-2 py-1 bg-white/5 border border-dashed border-white/10 rounded text-xs text-white outline-none"
                          />
                          <button
                            onClick={() => {
                              if (newFeature.trim()) {
                                setTextFields({ ...textFields, features: [...textFields.features, newFeature.trim()] });
                                setNewFeature("");
                              }
                            }}
                            className="text-blue-400 hover:text-blue-300 text-xs px-1"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500">Call to Action</label>
                      <input
                        placeholder="e.g. Shop Now"
                        value={textFields.cta}
                        onChange={(e) => setTextFields({ ...textFields, cta: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateCanvas}
                    disabled={generatingCanvas}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {generatingCanvas ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating designs...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Visuals
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview Gallery */}
              <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Generated Visuals</CardTitle>
                  <CardDescription className="text-gray-400">Review your generated creations below.</CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-16 text-gray-400">
                      <LayoutGrid className="w-16 h-16 mb-4 opacity-50" />
                      <p>Enter settings and hit generate to view visual choices.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {generatedImages.map((img, i) => (
                        <div key={i} className="group relative bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-lg">
                          <img
                            src={img.base64 ? `data:image/png;base64,${img.base64}` : `${PYTHON_API}${img.url}`}
                            alt={`Generated option ${i + 1}`}
                            className="w-full h-auto object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent && !parent.querySelector('.img-fallback')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'img-fallback flex items-center justify-center h-48 text-gray-500 text-sm';
                                fallback.textContent = 'Image failed to load';
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all duration-300">
                            <a
                              href={img.base64 ? `data:image/png;base64,${img.base64}` : `${PYTHON_API}${img.url}`}
                              download={`Cre8Studio_${purpose}_${i}.png`}
                              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                            >
                              <Download className="w-5 h-5" />
                            </a>
                            <button
                              onClick={() => handleSaveCanvasAsset(img)}
                              className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition"
                            >
                              <Save className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 🎬 Shorts Tab Content */}
          <TabsContent value="shorts">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Controls */}
              <Card className="lg:col-span-1 bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Shorts Settings</CardTitle>
                  <CardDescription className="text-gray-400">Generate a short video from a script or AI prompt.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Mode Toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShortMode("script")}
                      className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                        shortMode === "script"
                          ? "bg-blue-600/20 border-blue-500 text-white"
                          : "border-white/10 text-gray-400 hover:bg-white/5"
                      }`}
                    >
                      From Script
                    </button>
                    <button
                      onClick={() => setShortMode("prompt")}
                      className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                        shortMode === "prompt"
                          ? "bg-purple-600/20 border-purple-500 text-white"
                          : "border-white/10 text-gray-400 hover:bg-white/5"
                      }`}
                    >
                      From Prompt
                    </button>
                  </div>

                  {/* Script Mode Controls */}
                  {shortMode === "script" ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Short Title</label>
                        <Input
                          placeholder="e.g. 5 Coding Tricks"
                          value={shortTitle}
                          onChange={(e) => setShortTitle(e.target.value)}
                          className="bg-white/5 border-white/10 text-white focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Voice Mode</label>
                        <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                          <div className="flex items-center gap-3">
                            {voiceMode === "voiced" ? <Volume2 className="text-blue-400" /> : <VolumeX className="text-gray-400" />}
                            <div>
                              <p className="text-sm font-semibold text-white">Auto Voiceover</p>
                              <p className="text-xs text-gray-400">Speak script using AI voice</p>
                            </div>
                          </div>
                          <Switch
                            checked={voiceMode === "voiced"}
                            onCheckedChange={(checked) => setVoiceMode(checked ? "voiced" : "silent")}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Campaign Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setOutputTag("organic")}
                            className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                              outputTag === "organic" 
                                ? "bg-blue-600/20 border-blue-500 text-white" 
                                : "border-white/10 text-gray-400 hover:bg-white/5"
                            }`}
                          >
                            Organic Content
                          </button>
                          <button
                            onClick={() => setOutputTag("ad")}
                            className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                              outputTag === "ad" 
                                ? "bg-purple-600/20 border-purple-500 text-white" 
                                : "border-white/10 text-gray-400 hover:bg-white/5"
                            }`}
                          >
                            Video Advertisement
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Script Content</label>
                        <Textarea
                          placeholder="Write or paste your script here..."
                          value={shortScript}
                          onChange={(e) => setShortScript(e.target.value)}
                          className="bg-white/5 border-white/10 text-white h-48 focus:border-blue-500"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Duration Slider */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">
                          Duration: <span className="text-blue-400">{videoDuration}s</span>
                        </label>
                        <input
                          type="range"
                          min={4}
                          max={15}
                          value={videoDuration}
                          onChange={(e) => setVideoDuration(Number(e.target.value))}
                          className="w-full accent-blue-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>4s</span>
                          <span>15s</span>
                        </div>
                      </div>

                      {/* Aspect Ratio */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Aspect Ratio</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setVideoAspectRatio("16:9")}
                            className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                              videoAspectRatio === "16:9"
                                ? "bg-blue-600/20 border-blue-500 text-white"
                                : "border-white/10 text-gray-400 hover:bg-white/5"
                            }`}
                          >
                            Landscape (16:9)
                          </button>
                          <button
                            onClick={() => setVideoAspectRatio("9:16")}
                            className={`p-3 rounded-lg border text-xs font-semibold transition-all ${
                              videoAspectRatio === "9:16"
                                ? "bg-purple-600/20 border-purple-500 text-white"
                                : "border-white/10 text-gray-400 hover:bg-white/5"
                            }`}
                          >
                            Portrait (9:16)
                          </button>
                        </div>
                      </div>

                      {/* Reference Image Upload */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Reference Image (optional)</label>
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-white/20 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-all">
                            <Upload className="w-4 h-4" />
                            {videoReferenceFile ? "Change image" : "Upload reference"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => setVideoReferenceFile(e.target.files?.[0] || null)}
                            />
                          </label>
                          {videoReferenceFile && (
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-md overflow-hidden border border-white/10 flex-shrink-0">
                                <img
                                  src={URL.createObjectURL(videoReferenceFile)}
                                  alt="Reference"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="text-xs text-gray-400 truncate max-w-[100px]">
                                {videoReferenceFile.name}
                              </span>
                              <button
                                onClick={() => setVideoReferenceFile(null)}
                                className="text-red-400 hover:text-red-300 text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Video Prompt */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Video Prompt</label>
                        <Textarea
                          placeholder="Describe the video you want to generate. Be specific about scenes, style, and motion..."
                          value={videoPrompt}
                          onChange={(e) => setVideoPrompt(e.target.value)}
                          className="bg-white/5 border-white/10 text-white h-48 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={shortMode === "script" ? handleGenerateShort : handleGenerateVideo}
                    disabled={generatingShort || (shortMode === "prompt" && !videoPrompt.trim())}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {generatingShort ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {shortMode === "script" ? "Rendering video..." : "Generating video..."}
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4 mr-2" />
                        {shortMode === "script" ? "Render short MP4" : "Generate AI Video"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Video Player Box */}
              <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Video Preview</CardTitle>
                  <CardDescription className="text-gray-400">Play and preview the compiled video.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
                  {generatedVideo ? (
                    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                      <div className="relative aspect-[9/16] w-full max-w-[280px] bg-black border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
                        <video
                          src={`${PYTHON_API}${generatedVideo.url}`}
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-4">
                        <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5">
                          <a href={`${PYTHON_API}${generatedVideo.url}`} download>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </Button>
                        <Button onClick={handleSaveVideoAsset} className="bg-purple-600 hover:bg-purple-700">
                          <Save className="w-4 h-4 mr-2" />
                          Save to Assets
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-400 text-center">
                      <FileVideo className="w-16 h-16 mb-4 opacity-50" />
                      <p>Choose a mode and generate a video.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ✂️ Clipper Tab Content */}
          <TabsContent value="clipper">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Controls */}
              <Card className="lg:col-span-1 bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">AI Raw Video Clipper</CardTitle>
                  <CardDescription className="text-gray-400">Upload raw footage and let Gemini find viral segments.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* File Upload zone */}
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-8 hover:bg-white/5 transition duration-300">
                    <Upload className="w-10 h-10 mb-4 text-blue-400" />
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime"
                      onChange={(e) => setClipperFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="clipper-file-input"
                    />
                    <label htmlFor="clipper-file-input" className="cursor-pointer text-sm font-semibold text-blue-400 hover:underline">
                      {clipperFile ? clipperFile.name : "Select raw MP4 / MOV file"}
                    </label>
                    <p className="text-xs text-gray-400 mt-2">Maximum file size recommended: 50MB</p>
                  </div>

                  {generatingClips && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Uploading & Processing video...</span>
                        <span>{clippingProgress}%</span>
                      </div>
                      <Progress value={clippingProgress} className="h-2 bg-white/10" />
                    </div>
                  )}

                  <Button
                    onClick={handleClipperUpload}
                    disabled={!clipperFile || generatingClips}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {generatingClips ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AI is analyzing...
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4 mr-2" />
                        Clip Viral Highlight
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Output Clips */}
              <Card className="lg:col-span-2 bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">AI Highlight Clips</CardTitle>
                  <CardDescription className="text-gray-400">Preview extracted highlights with burned-in captions.</CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedClips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400">
                      <Scissors className="w-16 h-16 mb-4 opacity-50" />
                      <p>Upload a raw video file to slice into highlight shorts.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {generatedClips.map((clip, i) => (
                        <div key={i} className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                              Clip #{i + 1} ({clip.start} - {clip.end})
                            </span>
                            <span className="text-xs text-gray-400">Reason: {clip.reason || 'Highlights'}</span>
                          </div>

                          <div className="relative aspect-[9/16] w-full max-w-[200px] mx-auto bg-black border border-white/10 rounded-xl overflow-hidden">
                            {clip.url ? (
                              <video
                                src={`${PYTHON_API}${clip.url}`}
                                controls
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const el = e.currentTarget;
                                  el.style.display = "none";
                                  el.nextElementSibling?.classList.remove("hidden");
                                }}
                              />
                            ) : null}
                            <div className="hidden absolute inset-0 flex items-center justify-center text-gray-500 text-sm p-4 text-center">
                              Preview unavailable
                            </div>
                          </div>

                          <p className="text-sm font-semibold text-center mt-2 italic text-gray-300">
                            "{clip.caption}"
                          </p>

                          <div className="flex gap-2">
                            {clip.url ? (
                              <Button asChild variant="outline" size="sm" className="w-full border-white/10 text-white hover:bg-white/5">
                                <a href={`${PYTHON_API}${clip.url}`} download>
                                  <Download className="w-4 h-4 mr-1" />
                                  Download
                                </a>
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" disabled className="w-full border-white/10 text-gray-500">
                                <Download className="w-4 h-4 mr-1" />
                                Unavailable
                              </Button>
                            )}
                            <Button
                              onClick={() => handleSaveClipAsset(clip, i)}
                              size="sm"
                              className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Save Asset
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Saved Assets Library */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Studio Asset Library</CardTitle>
            <CardDescription className="text-gray-400">Your saved designs and video short assets.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAssets ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : savedAssets.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No saved assets in your library yet. Generate designs and save them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {savedAssets.map((asset) => (
                  <div key={asset._id} className="group relative bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-lg p-2 flex flex-col justify-between">
                    <div className="aspect-video w-full bg-black/60 rounded-lg overflow-hidden flex items-center justify-center mb-2">
                      {asset.type === "image" || asset.type === "thumbnail" || asset.type === "poster" || asset.type === "ad_creative" ? (
                        <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="w-8 h-8 text-blue-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold truncate text-gray-200">{asset.title}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{asset.type}</p>
                    </div>
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-300">
                      <a
                        href={asset.url}
                        download
                        className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Cre8Studio;
