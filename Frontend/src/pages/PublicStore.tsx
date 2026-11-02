import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  ShoppingBag, DollarSign, CheckCircle2, AlertTriangle, ArrowLeft, 
  Loader2, CreditCard, ShieldCheck, Mail, Zap
} from "lucide-react";
import { apiService } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export const PublicStore = ({ mode }: { mode?: "success" | "mock_checkout" }) => {
  const { creatorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [creator, setCreator] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingStore, setLoadingStore] = useState(true);

  const [buyingProduct, setBuyingProduct] = useState<any>(null);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [generatingCheckout, setGeneratingCheckout] = useState(false);

  const sessionId = searchParams.get("session_id");
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (mode === "success") return;
    if (mode === "mock_checkout") return;
    if (creatorId) fetchStorefront();
  }, [creatorId, mode]);

  const fetchStorefront = async () => {
    setLoadingStore(true);
    try {
      const res = await apiService.getPublicStorefront(creatorId!);
      if (res.data) {
        setCreator(res.data.creator);
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.error("Failed to load storefront", err);
      toast({ title: "Storefront unavailable", description: "Could not load products for this creator.", variant: "destructive" });
    } finally {
      setLoadingStore(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerEmail.trim()) {
      toast({ title: "Email required", description: "Please enter your email to receive order updates.", variant: "destructive" });
      return;
    }
    setGeneratingCheckout(true);
    try {
      const res = await apiService.createCheckoutSession({ productId: buyingProduct._id, customerEmail: buyerEmail });
      if (res.error) throw new Error(res.error);
      if (res.data?.url) {
        if (res.data.mock) {
          navigate(`/store/checkout/mock?session_id=${res.data.stripeSessionId || res.data.orderId}`);
        } else {
          window.location.href = res.data.url;
        }
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingCheckout(false);
    }
  };

  const handleConfirmMockPayment = async () => {
    if (!sessionId) return;
    setConfirmingPayment(true);
    try {
      const res = await apiService.confirmMockPayment(sessionId);
      if (res.error) throw new Error(res.error);
      setPaymentSuccess(true);
      toast({ title: "Sandbox checkout complete!", description: "Payment simulated successfully." });
      setTimeout(() => navigate(`/store/success?session_id=${sessionId}`), 1500);
    } catch (err: any) {
      toast({ title: "Payment simulation failed", description: err.message, variant: "destructive" });
    } finally {
      setConfirmingPayment(false);
    }
  };

  if (mode === "success") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-xl py-6">
          <CardContent className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-white text-2xl font-bold">Purchase Successful!</CardTitle>
              <CardDescription className="text-gray-400">Thank you for your order. A receipt has been sent to your email.</CardDescription>
            </div>
            <div className="border border-white/5 bg-white/5 p-4 rounded-lg w-full text-left space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Session ID:</span><span className="font-mono text-[10px]">{sessionId}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Status:</span><span className="text-green-400 font-semibold">PAID</span></div>
            </div>
            <p className="text-xs text-gray-400">The creator is preparing your digital assets and will contact you shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "mock_checkout") {
    return (
      <div className="min-h-screen bg-[#f8f9fa] text-gray-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg bg-white border border-gray-200 shadow-2xl overflow-hidden rounded-2xl">
          <div className="bg-[#635bff] p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-2"><CreditCard className="w-6 h-6" /><span className="font-bold tracking-tight text-lg">stripe <span className="font-light opacity-85">checkout</span></span></div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">Test Mode</span>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">Simulate Payment</h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">This is a secure checkout sandbox. You can simulate a successful Stripe card purchase.</p>
            </div>
            <div className="border border-yellow-200 bg-yellow-50/50 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-yellow-800">Sandbox Wallet Trigger</p>
                <p className="text-[11px] text-yellow-700 mt-0.5">Clicking pay will fire a mock checkout success callback to the backend, marking the order as paid without charging a real card.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-3 text-sm"><span className="text-gray-500 font-medium">Session Identifier</span><span className="font-mono text-xs">{sessionId}</span></div>
              <div className="flex justify-between border-b pb-3 text-sm"><span className="text-gray-500 font-medium">Payment Provider</span><span className="text-blue-600 font-semibold">Stripe Sandbox API</span></div>
            </div>
            <div className="flex gap-4 pt-2">
              <Button onClick={() => navigate(-1)} variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</Button>
              <Button onClick={handleConfirmMockPayment} disabled={confirmingPayment || paymentSuccess} className="w-full bg-[#635bff] hover:bg-[#5249cf] text-white">
                {confirmingPayment ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Simulating...</> : paymentSuccess ? "Payment Confirmed" : <><ShieldCheck className="w-4 h-4 mr-2" /> Simulate Payment</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      {loadingStore ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          <p className="text-gray-400 text-sm">Loading catalog storefront...</p>
        </div>
      ) : !creator ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-600" />
          <p className="text-xl font-bold">Storefront Not Found</p>
          <p className="text-gray-400 text-sm">The requested creator does not exist or has closed their store.</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row items-center gap-6 border-b border-white/10 pb-8 text-center md:text-left">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-green-500 to-blue-500 p-0.5">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                {creator.avatar ? <img src={creator.avatar} alt={creator.fullName} className="w-full h-full object-cover" /> : <span className="text-3xl font-extrabold text-white">{creator.fullName.charAt(0)}</span>}
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black">{creator.fullName}</h1>
              <p className="text-xs uppercase tracking-widest text-green-400 font-bold bg-green-500/10 px-3 py-1 rounded-full inline-block">{creator.role?.replace('-', ' ')}</p>
              <p className="text-sm text-gray-400 max-w-xl">{creator.bio || 'Welcome to my digital asset store!'}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingBag className="text-green-400" /> Catalog items</h2>
            {products.length === 0 ? (
              <p className="text-sm text-gray-400 py-12">No products are currently active in this store.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {products.map((p) => (
                  <div key={p._id} className={`bg-white/5 border rounded-2xl overflow-hidden transition flex flex-col justify-between p-4 space-y-4 ${p.isPromoted ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-white/10 hover:border-green-500/30'}`}>
                    <div className="space-y-3">
                      <div className="aspect-video bg-black/60 rounded-xl overflow-hidden flex items-center justify-center relative border border-white/5">
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <ShoppingBag className="w-12 h-12 text-gray-600" />}
                        <span className="absolute top-2 right-2 bg-black/80 text-green-400 text-sm font-extrabold px-2.5 py-1 rounded-lg">
                          {formatCurrency(p.price, "INR")}
                        </span>
                        {p.isPromoted && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-yellow-600 text-white text-[10px] flex items-center gap-1"><Zap className="w-3 h-3" /> Featured</Badge>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg text-white">{p.name}</h3>
                        <p className="text-xs text-gray-400 line-clamp-3">{p.description}</p>
                      </div>
                    </div>
                    <Button onClick={() => setBuyingProduct(p)} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">Buy Now</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {buyingProduct && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md bg-cre8-dark border-white/10 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-white">Review & Checkout</CardTitle>
                    <CardDescription className="text-gray-400">Complete your purchase safely.</CardDescription>
                  </div>
                  <button onClick={() => setBuyingProduct(null)} className="text-gray-400 hover:text-white text-lg">×</button>
                </CardHeader>
                <form onSubmit={handleCheckout} className="p-6 space-y-4">
                  <div className="flex gap-4 items-center bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="w-16 h-12 bg-black rounded overflow-hidden flex-shrink-0">
                      {buyingProduct.image ? <img src={buyingProduct.image} alt={buyingProduct.name} className="w-full h-full object-cover" /> : <ShoppingBag className="w-6 h-6 m-auto text-gray-500" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{buyingProduct.name}</p>
                      <p className="text-xs text-green-400 font-extrabold">{formatCurrency(buyingProduct.price, "INR")}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</label>
                    <Input type="email" required placeholder="you@example.com" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <Button type="submit" disabled={generatingCheckout} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                    {generatingCheckout ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to checkout...</> : "Go to Checkout"}
                  </Button>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default PublicStore;
