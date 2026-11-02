import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Megaphone, Target, Image as ImageIcon, 
  Loader2, CheckCircle, ExternalLink, Package, 
  Copy, Check, DollarSign, Globe,
  BarChart3, Sparkles, Save, Wallet
} from "lucide-react";
import { apiService } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useBackendAuth } from "@/hooks/useBackendAuth";
import { formatCurrency } from "@/lib/format";

const Cre8Campaigns = () => {
  const { user } = useBackendAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const currency = user?.currency || "INR";

  // Products
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Ad Copy
  const [platform, setPlatform] = useState("meta");
  const [targetAudience, setTargetAudience] = useState("");
  const [generatedCopy, setGeneratedCopy] = useState<string>("");
  const [generatingCopy, setGeneratingCopy] = useState(false);

  // Creatives
  const [creatives, setCreatives] = useState<{ images: any[]; videos: any[] }>({ images: [], videos: [] });
  const [loadingCreatives, setLoadingCreatives] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // Budget & Wallet
  const [dailyBudget, setDailyBudget] = useState("50");
  const [wallet, setWallet] = useState<any>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Saved campaigns
  const [savedCampaigns, setSavedCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const selectedProduct = products.find(p => p._id === selectedProductId);

  useEffect(() => {
    fetchProducts();
    fetchCreatives();
    fetchSavedCampaigns();
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    setLoadingWallet(true);
    try {
      const res = await apiService.getWallet();
      if (res.data?.wallet) setWallet(res.data.wallet);
    } catch (err) {
      console.error("Failed to fetch wallet", err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await apiService.getAdProducts();
      if (res.data?.products) setProducts(res.data.products);
    } catch (err) {
      console.error("Failed to fetch products", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCreatives = async () => {
    setLoadingCreatives(true);
    try {
      const res = await apiService.getAdCreatives();
      if (res.data?.assets) setCreatives(res.data.assets);
    } catch (err) {
      console.error("Failed to fetch creatives", err);
    } finally {
      setLoadingCreatives(false);
    }
  };

  const fetchSavedCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const res = await apiService.getAssets({ type: "campaign_pack" });
      if (res.data?.assets) setSavedCampaigns(res.data.assets);
    } catch (err) {
      console.error("Failed to fetch campaigns", err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleGenerateCopy = async () => {
    if (!selectedProductId) {
      toast({ title: "Select a product", description: "Pick a product to generate ad copy for.", variant: "destructive" });
      return;
    }
    setGeneratingCopy(true);
    setGeneratedCopy("");
    try {
      const res = await apiService.generateAdCopy(selectedProductId, platform, targetAudience || undefined);
      if (res.error) throw new Error(res.error);
      setGeneratedCopy(res.data?.adCopy || "No copy generated.");
      toast({ title: "Ad Copy Generated!", description: "Review and use it in your campaign." });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingCopy(false);
    }
  };

  const toggleAsset = (id: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleExportPack = async () => {
    if (!selectedProductId || !generatedCopy) {
      toast({ title: "Missing info", description: "Select a product and generate ad copy first.", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      const res = await apiService.exportCampaignPack({
        productId: selectedProductId,
        adCopy: generatedCopy,
        selectedAssetIds,
        platform,
        targetAudience: targetAudience || "General",
        budget: dailyBudget,
      });
      if (res.error) throw new Error(res.error);
      toast({
        title: "Campaign Pack Exported!",
        description: "Your campaign has been saved. You can export it to Meta Ads Manager.",
      });
      setCopied(false);
      fetchSavedCampaigns();
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handlePromoteDirectly = async () => {
    if (!selectedProductId) {
      toast({ title: "Select a product", description: "Pick a product to promote.", variant: "destructive" });
      return;
    }
    const budget = parseFloat(dailyBudget);
    if (isNaN(budget) || budget <= 0) {
      toast({ title: "Invalid budget", description: "Enter a valid daily budget.", variant: "destructive" });
      return;
    }
    try {
      const res = await apiService.promoteProduct(selectedProductId, budget);
      if (res.error) throw new Error(res.error);
      toast({ title: "Product Promoted!", description: "Your product is now featured on the storefront." });
      fetchWallet();
    } catch (err: any) {
      toast({ title: "Promotion failed", description: err.message, variant: "destructive" });
    }
  };

  const copyAdCopy = () => {
    if (!generatedCopy) return;
    navigator.clipboard.writeText(generatedCopy);
    setCopied(true);
    toast({ title: "Copied!", description: "Ad copy copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const allCreatives = [...creatives.images, ...creatives.videos];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cre8-dark to-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
              Campaign Manager
            </h1>
            <p className="text-gray-400 mt-2">
              Create campaigns and promote your products across Cre8Hub.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2">
              <Wallet className="w-4 h-4 text-yellow-400" />
              <div>
                {loadingWallet ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <span className="text-sm font-bold text-white">{formatCurrency(wallet?.balance || 0, currency)}</span>
                )}
              </div>
            </div>
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5" onClick={() => navigate("/store")}>
              <Package className="w-4 h-4 mr-2" />
              Back to Store
            </Button>
            <Button
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              onClick={() => {
                if (loadingProducts) {
                  toast({ title: "Loading products", description: "Please wait while products finish loading.", variant: "default" });
                } else if (products.length === 0) {
                  toast({ title: "No products found", description: "Add a product in Cre8Store first.", variant: "destructive" });
                  navigate("/store");
                } else {
                  setSelectedProductId(products[0]._id);
                  toast({ title: "Product selected", description: `"${products[0].name}" ready for campaign.` });
                }
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Campaign
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-300">Wallet</CardTitle>
              <Wallet className="w-4 h-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-white">{formatCurrency(wallet?.balance || 0, currency)}</div>
              <p className="text-xs text-gray-400 mt-1">Available for promotion</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-300">Products</CardTitle>
              <Package className="w-4 h-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-white">{products.length}</div>
              <p className="text-xs text-gray-400 mt-1">Available for promotion</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-300">Creative Assets</CardTitle>
              <ImageIcon className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-white">{allCreatives.length}</div>
              <p className="text-xs text-gray-400 mt-1">In your studio library</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-300">Saved Campaigns</CardTitle>
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-white">{savedCampaigns.length}</div>
              <p className="text-xs text-gray-400 mt-1">Campaign packs exported</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Campaign Builder */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-400" />
              Campaign Builder
            </CardTitle>
            <CardDescription className="text-gray-400">
              Step through each stage to promote your product on Cre8Hub.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* Step 1: Select Product */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-600 text-white">Step 1</Badge>
                <h3 className="font-semibold text-white">Select Product to Promote</h3>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  {loadingProducts ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading products...
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-sm text-gray-400">
                      No products found.{" "}
                      <button onClick={() => navigate("/store")} className="text-orange-400 underline">
                        Go to Cre8Store
                      </button>{" "}
                      to add one first.
                    </div>
                  ) : (
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                        <SelectValue placeholder="Choose a product..." />
                      </SelectTrigger>
                      <SelectContent className="bg-cre8-dark border-white/10 text-white">
                        {products.map(p => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name} — {formatCurrency(p.price, currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {selectedProduct && (
                  <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-white/10 bg-black">
                    {selectedProduct.image ? (
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Ad Copy */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-600 text-white">Step 2</Badge>
                <h3 className="font-semibold text-white">Generate Ad Copy</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Platform</label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cre8-dark border-white/10 text-white">
                      <SelectItem value="meta">Meta (Facebook/Instagram)</SelectItem>
                      <SelectItem value="google">Google Ads</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="twitter">X / Twitter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Target Audience</label>
                  <Input
                    placeholder="e.g. Creators aged 18-35, USA"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleGenerateCopy}
                    disabled={generatingCopy || !selectedProductId}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                  >
                    {generatingCopy ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Generate Copy</>
                    )}
                  </Button>
                </div>
              </div>
              {generatedCopy && (
                <div className="relative bg-black/40 border border-white/10 rounded-lg p-4 mt-3">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">{generatedCopy}</pre>
                  <Button variant="outline" size="sm" onClick={copyAdCopy}
                    className="absolute top-3 right-3 border-white/10 text-white hover:bg-white/5">
                    {copied ? <><Check className="w-3.5 h-3.5 mr-1" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
                  </Button>
                </div>
              )}
            </div>

            {/* Step 3: Select Creatives */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white">Step 3</Badge>
                <h3 className="font-semibold text-white">Select Creative Assets</h3>
                <span className="text-xs text-gray-400">({selectedAssetIds.length} selected)</span>
              </div>
              {loadingCreatives ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading studio assets...
                </div>
              ) : allCreatives.length === 0 ? (
                <div className="text-sm text-gray-400 py-4">
                  No creative assets found.{" "}
                  <button onClick={() => navigate("/studio")} className="text-orange-400 underline">
                    Go to Cre8Studio
                  </button>{" "}
                  to generate images and videos first.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {allCreatives.map((asset) => {
                      const isSelected = selectedAssetIds.includes(asset._id);
                      return (
                        <div
                          key={asset._id}
                          onClick={() => toggleAsset(asset._id)}
                          className={`relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition group
                            ${isSelected ? "border-orange-500 ring-2 ring-orange-500/30" : "border-white/10 hover:border-white/30"}
                          `}
                        >
                          {asset.url ? (
                            <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black/50">
                              <ImageIcon className="w-8 h-8 text-gray-600" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-orange-600 rounded-full p-0.5">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                            <p className="text-[10px] text-white truncate">{asset.title || asset.type}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedAssetIds([])}
                      className="border-white/10 text-gray-400 hover:text-white">Clear Selection</Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedAssetIds(allCreatives.map(a => a._id))}
                      className="border-white/10 text-gray-400 hover:text-white">Select All</Button>
                  </div>
                </>
              )}
            </div>

            {/* Step 4: Budget & Launch */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600 text-white">Step 4</Badge>
                <h3 className="font-semibold text-white">Budget & Launch</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">
                    <DollarSign className="w-3 h-3 inline mr-1" />
                    Budget ({currency})
                  </label>
                  <Input type="number" placeholder={currency === "INR" ? "500" : "50"}
                    value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)}
                    className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">
                    <Globe className="w-3 h-3 inline mr-1" />
                    Platform
                  </label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cre8-dark border-white/10 text-white">
                      <SelectItem value="meta">Cre8Hub Storefront</SelectItem>
                      <SelectItem value="google">Meta Ads (export)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handlePromoteDirectly}
                  disabled={exporting || !selectedProductId}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  Promote on Cre8Hub
                </Button>
                <Button
                  onClick={handleExportPack}
                  disabled={exporting || !selectedProductId || !generatedCopy}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {exporting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Export Campaign Pack</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <ExternalLink className="w-3 h-3 inline mr-1" />
                "Promote on Cre8Hub" features your product on the storefront. "Export Campaign Pack" saves a draft for Meta Ads Manager.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Saved Campaigns */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Saved Campaigns
            </CardTitle>
            <CardDescription className="text-gray-400">
              Previously exported campaign packs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCampaigns ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : savedCampaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-50 text-orange-400" />
                <p className="text-lg">No campaigns exported yet.</p>
                <p className="text-sm mt-1">Build and export your first campaign above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedCampaigns.map((campaign) => {
                  const meta = campaign.metadata || {};
                  return (
                    <div key={campaign._id} className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-2 hover:border-orange-500/40 transition">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-white text-sm">{campaign.title}</h3>
                        <Badge variant="outline" className="border-orange-500/30 text-orange-400 text-[10px]">{meta.platform || "meta"}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{campaign.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1">
                        <span>Budget: {formatCurrency(parseFloat(meta.dailyBudget) || 0, currency)}/day</span>
                        <span>Audience: {meta.targetAudience || "General"}</span>
                      </div>
                      <div className="text-[11px] text-gray-500">Creatives: {meta.creatives?.length || 0} assets</div>
                      <div className="text-[10px] text-gray-600">Exported: {new Date(campaign.createdAt).toLocaleDateString()}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Cre8Campaigns;
