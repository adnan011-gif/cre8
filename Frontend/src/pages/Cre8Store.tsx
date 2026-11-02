import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingBag, DollarSign, Users, Award, Tag, Plus, Loader2, 
  Trash2, Globe, CheckCircle, Clock, ExternalLink, Image as ImageIcon, Megaphone, Wallet, IndianRupee, Zap
} from "lucide-react";
import { apiService } from "@/lib/api";
import { useBackendAuth } from "@/hooks/useBackendAuth";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/format";

const Cre8Store = () => {
  const { user } = useBackendAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const currency = user?.currency || "INR";

  // ── Product States ───────────────────────────────────────────────────────
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductImage, setNewProductImage] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // ── Asset Selection (Studio Integration) ──────────────────────────────────
  const [studioAssets, setStudioAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);

  // ── Order States ─────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // ── Wallet States ────────────────────────────────────────────────────────
  const [wallet, setWallet] = useState<any>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [isDepositConfirmOpen, setIsDepositConfirmOpen] = useState(false);
  const [depositSessionId, setDepositSessionId] = useState<string | null>(null);
  const [confirmingDeposit, setConfirmingDeposit] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchStudioAssets();
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
      const res = await apiService.getProducts();
      if (res.data && res.data.products) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await apiService.getCreatorOrders();
      if (res.data && res.data.orders) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchStudioAssets = async () => {
    setLoadingAssets(true);
    try {
      const res = await apiService.getAssets({ hub: "studio", type: "image" });
      if (res.data && res.data.assets) {
        setStudioAssets(res.data.assets);
      }
    } catch (err) {
      console.error("Failed to load studio assets", err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProductName.trim() || !newProductPrice.trim()) {
      toast({ title: "Validation error", description: "Name and Price are required.", variant: "destructive" });
      return;
    }
    const priceNum = parseFloat(newProductPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: "Validation error", description: "Please enter a valid positive price.", variant: "destructive" });
      return;
    }
    setAddingProduct(true);
    try {
      const res = await apiService.createProduct({ name: newProductName, description: newProductDesc, price: priceNum, image: newProductImage });
      if (res.error) throw new Error(res.error);
      toast({ title: "Product listed!", description: `Listed "${newProductName}" in your public storefront.` });
      setNewProductName(""); setNewProductPrice(""); setNewProductDesc(""); setNewProductImage("");
      setIsCreateOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Failed to add product", description: err.message, variant: "destructive" });
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await apiService.deleteProduct(id);
      if (res.error) throw new Error(res.error);
      toast({ title: "Product deleted", description: "Product has been removed from your store." });
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: "paid" | "fulfilled" | "refunded") => {
    setUpdatingOrderId(orderId);
    try {
      const res = await apiService.updateOrderStatus(orderId, status);
      if (res.error) throw new Error(res.error);
      toast({ title: "Order updated", description: `Order is now marked as ${status}.` });
      fetchOrders();
    } catch (err: any) {
      toast({ title: "Status change failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid positive amount.", variant: "destructive" });
      return;
    }
    setDepositing(true);
    try {
      const res = await apiService.depositToWallet(amount);
      if (res.error) throw new Error(res.error);
      setDepositSessionId(res.data?.sessionId);
      setIsAddFundsOpen(false);
      setIsDepositConfirmOpen(true);
      toast({ title: "Deposit initiated", description: `Added ${formatCurrency(amount, currency)} to your wallet.` });
    } catch (err: any) {
      toast({ title: "Deposit failed", description: err.message, variant: "destructive" });
    } finally {
      setDepositing(false);
    }
  };

  const handleConfirmDeposit = async () => {
    if (!depositSessionId) return;
    setConfirmingDeposit(true);
    try {
      const res = await apiService.confirmWalletDeposit(depositSessionId);
      if (res.error) throw new Error(res.error);
      toast({ title: "Wallet credited!", description: `New balance: ${formatCurrency(res.data?.balance || 0, currency)}` });
      setIsDepositConfirmOpen(false);
      setDepositAmount("");
      fetchWallet();
    } catch (err: any) {
      toast({ title: "Confirmation failed", description: err.message, variant: "destructive" });
    } finally {
      setConfirmingDeposit(false);
    }
  };

  const handlePromoteProduct = async (product: any) => {
    const budget = parseFloat(prompt(`Enter promotion budget (${currency}) for "${product.name}":`, "500") || "0");
    if (isNaN(budget) || budget <= 0) return;
    try {
      const res = await apiService.promoteProduct(product._id, budget);
      if (res.error) throw new Error(res.error);
      toast({ title: "Product Promoted!", description: `"${product.name}" is now featured.` });
      fetchProducts();
      fetchWallet();
    } catch (err: any) {
      toast({ title: "Promotion failed", description: err.message, variant: "destructive" });
    }
  };

  const handleUnPromoteProduct = async (productId: string) => {
    try {
      const res = await apiService.unPromoteProduct(productId);
      if (res.error) throw new Error(res.error);
      toast({ title: "Promotion removed", description: "Product is no longer featured." });
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Failed to remove promotion", description: err.message, variant: "destructive" });
    }
  };

  const totalSales = orders.filter(o => o.status === "paid" || o.status === "fulfilled").reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = orders.length;
  const fulfilledCount = orders.filter(o => o.status === "fulfilled").length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cre8-dark to-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Cre8Store
            </h1>
            <p className="text-gray-400 mt-2">
              Launch your creator storefront, list your products/merch, and track customer orders.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Wallet Badge */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2">
              <Wallet className="w-4 h-4 text-yellow-400" />
              <div>
                {loadingWallet ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <>
                    <span className="text-sm font-bold text-white">{formatCurrency(wallet?.balance || 0, currency)}</span>
                    <button onClick={() => setIsAddFundsOpen(true)} className="ml-2 text-[10px] text-yellow-400 hover:text-yellow-300 underline">
                      Add Funds
                    </button>
                  </>
                )}
              </div>
            </div>

            <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5">
              <a href={`/store/${user?.id}`} target="_blank" rel="noreferrer">
                <Globe className="w-4 h-4 mr-2" />
                Visit Store
              </a>
            </Button>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-cre8-dark border-white/10 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">List New Product</DialogTitle>
                  <DialogDescription className="text-gray-400">Add merchandise, templates, or digital courses to sell.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300">Product Name</label>
                    <Input placeholder="e.g. My Premium Presets" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300">Price ({currency})</label>
                    <Input type="number" placeholder={`e.g. ${currency === "INR" ? "499" : "29.99"}`} value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300">Product Image URL</label>
                    <div className="flex gap-2">
                      <Input placeholder="Paste URL or click Pick from Studio" value={newProductImage} onChange={(e) => setNewProductImage(e.target.value)} className="bg-white/5 border-white/10 text-white flex-grow text-xs" />
                      <Dialog open={isAssetPickerOpen} onOpenChange={setIsAssetPickerOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-white/10 text-white"><ImageIcon className="w-4 h-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="bg-cre8-dark border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-white">Choose Cover from Asset Library</DialogTitle>
                            <DialogDescription className="text-gray-400">Select one of the designs you generated in Cre8Studio.</DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-3 gap-2 py-4">
                            {studioAssets.length === 0 ? (
                              <p className="text-xs text-gray-400 col-span-3 text-center py-6">No studio image assets found.</p>
                            ) : (
                              studioAssets.map((asset) => (
                                <div key={asset._id} onClick={() => { setNewProductImage(asset.url); setIsAssetPickerOpen(false); toast({ title: "Asset Selected", description: asset.title }); }}
                                  className="border border-white/10 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition aspect-video relative group">
                                  <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition">Select</div>
                                </div>
                              ))
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300">Description</label>
                    <Textarea placeholder="Explain what the buyer gets after purchasing..." value={newProductDesc} onChange={(e) => setNewProductDesc(e.target.value)} className="bg-white/5 border-white/10 text-white h-24" />
                  </div>
                  <Button onClick={handleCreateProduct} disabled={addingProduct} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                    {addingProduct ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Listing...</> : "Publish Product"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-300">Wallet Balance</CardTitle>
              <Wallet className="w-4 h-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-white">{formatCurrency(wallet?.balance || 0, currency)}</div>
              <p className="text-xs text-gray-400 mt-1">Available for promotions</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-300">Total Sales Volume</CardTitle>
              <DollarSign className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-white">{formatCurrency(totalSales, currency)}</div>
              <p className="text-xs text-gray-400 mt-1">From Stripe Test Mode & Sandbox wallets</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-300">Total Orders</CardTitle>
              <ShoppingBag className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-white">{totalOrdersCount}</div>
              <p className="text-xs text-gray-400 mt-1">Pending + Paid + Fulfilled</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-300">Fulfillment Rate</CardTitle>
              <Award className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-white">{totalOrdersCount > 0 ? `${Math.round((fulfilledCount / totalOrdersCount) * 100)}%` : "0%"}</div>
              <p className="text-xs text-gray-400 mt-1">{fulfilledCount} out of {totalOrdersCount} orders fulfilled</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Funds Dialog */}
        <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
          <DialogContent className="bg-cre8-dark border-white/10 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white">Add Funds to Wallet</DialogTitle>
              <DialogDescription className="text-gray-400">Deposit money to promote your products across Cre8Hub.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Amount ({currency})</label>
                <Input type="number" placeholder={currency === "INR" ? "e.g. 1000" : "e.g. 50"} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="bg-white/5 border-white/10 text-white" />
              </div>
              <Button onClick={handleDeposit} disabled={depositing} className="w-full bg-gradient-to-r from-yellow-600 to-orange-600">
                {depositing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : `Deposit ${formatCurrency(parseFloat(depositAmount || "0"), currency)}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Deposit Dialog */}
        <Dialog open={isDepositConfirmOpen} onOpenChange={setIsDepositConfirmOpen}>
          <DialogContent className="bg-cre8-dark border-white/10 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white">Confirm Deposit</DialogTitle>
              <DialogDescription className="text-gray-400">Click confirm to simulate the deposit in sandbox mode.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Button onClick={handleConfirmDeposit} disabled={confirmingDeposit} className="w-full bg-green-600 hover:bg-green-700">
                {confirmingDeposit ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming...</> : "Confirm & Credit Wallet"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Catalog & Orders Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
            <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600">
              Products Catalog
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600">
              Customer Orders
            </TabsTrigger>
          </TabsList>

          {/* Catalog Tab Content */}
          <TabsContent value="products">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Active Catalog</CardTitle>
                <CardDescription className="text-gray-400">Products currently listed on your public storefront page.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-green-500" /></div>
                ) : products.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Tag className="w-16 h-16 mx-auto mb-4 opacity-50 text-green-400" />
                    <p className="text-lg">No products listed yet.</p>
                    <p className="text-sm mt-1">Click Add Product above to list your first item.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {products.map((p) => (
                      <div key={p._id} className={`bg-black/30 border rounded-xl overflow-hidden shadow-lg transition flex flex-col justify-between ${p.isPromoted ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-white/10 hover:border-green-500/40'}`}>
                        <div>
                          <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-12 h-12 text-gray-600" />
                            )}
                            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur px-2.5 py-1 rounded text-sm font-bold text-green-400">
                              {formatCurrency(p.price, currency)}
                            </div>
                            {p.isPromoted && (
                              <div className="absolute top-2 left-2">
                                <Badge className="bg-yellow-600 text-white text-[10px] flex items-center gap-1">
                                  <Zap className="w-3 h-3" /> Featured
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="p-4 space-y-2">
                            <h3 className="font-bold text-white text-lg">{p.name}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2">{p.description}</p>
                          </div>
                        </div>
                        <div className="p-4 border-t border-white/5 flex gap-2">
                          <Button onClick={() => handleDeleteProduct(p._id)} variant="destructive" size="sm"
                            className="w-1/3 bg-red-950/40 hover:bg-red-900 border border-red-500/20 text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" /> Remove
                          </Button>
                          {p.isPromoted ? (
                            <Button onClick={() => handleUnPromoteProduct(p._id)} size="sm"
                              className="w-1/3 bg-yellow-950/40 hover:bg-yellow-900 border border-yellow-500/20 text-yellow-400">
                              <Zap className="w-4 h-4 mr-2" /> Featured
                            </Button>
                          ) : (
                            <Button onClick={() => handlePromoteProduct(p)} size="sm"
                              className="w-1/3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                              <Megaphone className="w-4 h-4 mr-2" /> Promote
                            </Button>
                          )}
                          <Button onClick={() => navigate(`/campaigns`)} size="sm" variant="outline"
                            className="w-1/3 border-white/10 text-white hover:bg-white/5">
                            <ExternalLink className="w-4 h-4 mr-2" /> Ads
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab Content */}
          <TabsContent value="orders">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Orders Log</CardTitle>
                <CardDescription className="text-gray-400">Manage order fulfillment status and view transactions.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-green-500" /></div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50 text-blue-400" />
                    <p className="text-lg">No customer transactions logged.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                      <thead className="text-xs uppercase bg-white/5 text-gray-400 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-3">Order ID</th>
                          <th className="px-6 py-3">Customer</th>
                          <th className="px-6 py-3">Product</th>
                          <th className="px-6 py-3">Total</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {orders.map((o) => (
                          <tr key={o._id} className="hover:bg-white/5 transition">
                            <td className="px-6 py-4 font-mono text-xs">{o._id.slice(-6).toUpperCase()}</td>
                            <td className="px-6 py-4">{o.customerEmail}</td>
                            <td className="px-6 py-4">{o.productId?.name || 'Deleted Product'}</td>
                            <td className="px-6 py-4 font-bold">{formatCurrency(o.total, currency)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                o.status === "fulfilled" ? "bg-green-500/20 text-green-400" :
                                o.status === "paid" ? "bg-blue-500/20 text-blue-400" :
                                o.status === "refunded" ? "bg-red-500/20 text-red-400" :
                                "bg-yellow-500/20 text-yellow-400"
                              }`}>{o.status.toUpperCase()}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {o.status === "paid" && (
                                <div className="flex justify-end gap-2">
                                  <Button onClick={() => handleUpdateOrderStatus(o._id, "fulfilled")} disabled={updatingOrderId === o._id} size="sm" className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1">Fulfill</Button>
                                  <Button onClick={() => handleUpdateOrderStatus(o._id, "refunded")} disabled={updatingOrderId === o._id} size="sm" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-950/20 text-xs px-3 py-1">Refund</Button>
                                </div>
                              )}
                              {o.status === "fulfilled" && <span className="text-xs text-gray-500 flex items-center justify-end gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Fulfilled</span>}
                              {o.status === "refunded" && <span className="text-xs text-red-400 flex items-center justify-end gap-1">Refunded</span>}
                              {o.status === "pending" && <span className="text-xs text-yellow-400 flex items-center justify-end gap-1"><Clock className="w-3.5 h-3.5" /> Awaiting Payment</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default Cre8Store;
