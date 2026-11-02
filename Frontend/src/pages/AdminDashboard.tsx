import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  Users, Activity, ShoppingBag, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, Clock, Zap, DollarSign, Shield, Server,
  XCircle, TrendingUp, ChevronRight
} from "lucide-react";
import { apiService } from "@/lib/api";
import { useBackendAuth } from "@/hooks/useBackendAuth";

const REFRESH_INTERVAL_MS = 60_000; // auto-refresh every 60s

const AdminDashboard = () => {
  const { user } = useBackendAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<any>(null);
  const [quotas, setQuotas] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, quotasRes, jobsRes, paymentsRes, alertsRes] = await Promise.all([
        apiService.request('/admin/stats'),
        apiService.request('/admin/quotas'),
        apiService.request('/admin/jobs'),
        apiService.request('/admin/payments'),
        apiService.request('/admin/alerts'),
      ]);

      if (statsRes.data)    setStats(statsRes.data);
      if (quotasRes.data)   setQuotas(quotasRes.data.quotas || []);
      if (jobsRes.data)     setJobs(jobsRes.data.jobs || []);
      if (paymentsRes.data) setPayments(paymentsRes.data);
      if (alertsRes.data)   setAlerts(alertsRes.data.alerts || []);
      setLastRefresh(new Date());
    } catch (err) {
      toast({ title: "Failed to load admin data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    try {
      await apiService.request(`/admin/alerts/${alertId}/resolve`, { method: 'PUT' });
      toast({ title: "Alert resolved" });
      setAlerts((prev) => prev.filter((a) => a._id !== alertId));
    } catch {
      toast({ title: "Failed to resolve alert", variant: "destructive" });
    }
  };

  const severityColor = (s: string) =>
    s === "critical" ? "text-red-400 bg-red-500/10 border-red-500/30" :
    s === "warning"  ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" :
                       "text-blue-400 bg-blue-500/10 border-blue-500/30";

  const jobStatusColor = (s: string) =>
    s === "completed" ? "text-green-400" :
    s === "running"   ? "text-blue-400" :
    s === "stuck"     ? "text-red-400"  :
    s === "failed"    ? "text-red-500"  :
                        "text-gray-400";

  return (
    <div className="min-h-screen bg-gradient-to-b from-cre8-dark to-black text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Platform health · Quota monitoring · Circuit breaker · Alerts
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className="text-xs text-gray-500">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={fetchAll}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/5"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {loading && !stats ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-12 h-12 animate-spin text-orange-400" />
          </div>
        ) : (
          <>
            {/* Top Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                {
                  label: "Total Creators",
                  value: stats?.creatorsCount ?? "—",
                  icon: <Users className="w-5 h-5 text-blue-400" />,
                  sub: `${stats?.agenciesCount ?? 0} agency accounts`,
                },
                {
                  label: "Active Jobs",
                  value: stats?.activeJobsCount ?? "—",
                  icon: <Activity className="w-5 h-5 text-green-400" />,
                  sub: `${stats?.jobsCount ?? 0} total queued`,
                },
                {
                  label: "Total Revenue",
                  value: `$${stats?.revenueTotal?.toFixed(2) ?? "0.00"}`,
                  icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
                  sub: "Stripe Test Mode",
                },
                {
                  label: "Open Alerts",
                  value: alerts.length,
                  icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
                  sub: "Unresolved incidents",
                },
              ].map((s, i) => (
                <Card key={i} className="bg-white/5 border-white/10 backdrop-blur-xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-medium text-gray-400">{s.label}</CardTitle>
                    {s.icon}
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-white">{s.value}</div>
                    <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="quotas" className="space-y-6">
              <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
                <TabsTrigger value="quotas"  className="rounded-lg data-[state=active]:bg-orange-600">
                  <Zap className="w-3.5 h-3.5 mr-1.5" /> Quotas
                </TabsTrigger>
                <TabsTrigger value="jobs"    className="rounded-lg data-[state=active]:bg-orange-600">
                  <Server className="w-3.5 h-3.5 mr-1.5" /> Job Queue
                </TabsTrigger>
                <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-orange-600">
                  <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Payments
                </TabsTrigger>
                <TabsTrigger value="alerts"  className="rounded-lg data-[state=active]:bg-orange-600">
                  <Shield className="w-3.5 h-3.5 mr-1.5" /> Alerts
                  {alerts.length > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {alerts.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Quota Monitor Tab */}
              <TabsContent value="quotas">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Creator Daily Quota Monitor</CardTitle>
                    <CardDescription className="text-gray-400">
                      Fair-use thresholds: 50 LLM calls · 20 image gens · 5 video gens per 24 hrs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {quotas.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>No creators found or quota data unavailable.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {quotas.map((q) => (
                          <div key={q.creatorId} className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-white">{q.fullName}</p>
                                <p className="text-xs text-gray-400">{q.email}</p>
                              </div>
                              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                q.usagePercentage >= 90 ? "bg-red-500/20 text-red-400" :
                                q.usagePercentage >= 70 ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-green-500/20 text-green-400"
                              }`}>
                                {q.usagePercentage}%
                              </span>
                            </div>
                            <Progress
                              value={q.usagePercentage}
                              className="h-2 bg-white/10"
                            />
                            <div className="grid grid-cols-3 gap-4 text-xs text-gray-400">
                              <div>
                                <span className="font-bold text-white">{q.usage.llmCalls}</span>
                                <span> / {q.limits.llm} LLM calls</span>
                              </div>
                              <div>
                                <span className="font-bold text-white">{q.usage.imageGens}</span>
                                <span> / {q.limits.image} images</span>
                              </div>
                              <div>
                                <span className="font-bold text-white">{q.usage.videoGens}</span>
                                <span> / {q.limits.video} videos</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Job Queue Tab */}
              <TabsContent value="jobs">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Job Queue Health</CardTitle>
                    <CardDescription className="text-gray-400">
                      Jobs running &gt; 5 min are auto-flagged as stuck and an alert is dispatched.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {jobs.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>No jobs in the queue.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                          <thead className="text-xs uppercase bg-white/5 text-gray-400 border-b border-white/10">
                            <tr>
                              <th className="px-4 py-3">Job ID</th>
                              <th className="px-4 py-3">Creator</th>
                              <th className="px-4 py-3">Task</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Progress</th>
                              <th className="px-4 py-3">Started</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {jobs.map((job) => (
                              <tr key={job._id} className="hover:bg-white/5 transition">
                                <td className="px-4 py-3 font-mono text-xs">{job._id.slice(-6).toUpperCase()}</td>
                                <td className="px-4 py-3">{job.creatorId?.fullName || "Unknown"}</td>
                                <td className="px-4 py-3 capitalize">{job.taskType.replace("_", " ")}</td>
                                <td className={`px-4 py-3 font-bold capitalize ${jobStatusColor(job.status)}`}>
                                  {job.status === "stuck" && <XCircle className="w-3.5 h-3.5 inline mr-1" />}
                                  {job.status === "running" && <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />}
                                  {job.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                                  {job.status}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <Progress value={job.progress} className="w-20 h-1.5 bg-white/10" />
                                    <span className="text-xs">{job.progress}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">
                                  {job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : "—"}
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

              {/* Payment Health Tab */}
              <TabsContent value="payments">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Payment Gateway Health</CardTitle>
                    <CardDescription className="text-gray-400">
                      Stripe Test Mode · Webhook delivery stats
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!payments ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        {[
                          { label: "Total Orders", value: payments.totalOrders, icon: <ShoppingBag className="w-4 h-4 text-blue-400" /> },
                          { label: "Successful", value: payments.successfulOrders, icon: <CheckCircle2 className="w-4 h-4 text-green-400" /> },
                          { label: "Pending", value: payments.pendingOrders, icon: <Clock className="w-4 h-4 text-yellow-400" /> },
                          { label: "Refund Rate", value: `${payments.refundRate}%`, icon: <TrendingUp className="w-4 h-4 text-red-400" /> },
                        ].map((p, i) => (
                          <div key={i} className="bg-black/30 border border-white/10 rounded-xl p-5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">{p.label}</span>
                              {p.icon}
                            </div>
                            <div className="text-3xl font-extrabold text-white">{p.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Alerts Tab */}
              <TabsContent value="alerts">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Platform Alerts & Circuit Breaker</CardTitle>
                    <CardDescription className="text-gray-400">
                      Auto-generated alerts from quota thresholds, stuck jobs, and payment failures. Resolve to dismiss.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {alerts.length === 0 ? (
                      <div className="text-center py-16 text-gray-400">
                        <Shield className="w-14 h-14 mx-auto mb-4 text-green-400 opacity-60" />
                        <p className="text-lg font-semibold text-white">All Clear</p>
                        <p className="text-sm mt-1">No active platform alerts at this time.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {alerts.map((alert) => (
                          <div key={alert._id} className={`border rounded-xl p-4 flex items-start justify-between gap-4 ${severityColor(alert.severity)}`}>
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                  <span>{alert.type.replace(/_/g, " ")}</span>
                                  <span className="opacity-60">·</span>
                                  <span>{alert.severity}</span>
                                </div>
                                <p className="text-sm leading-snug">{alert.message}</p>
                                {alert.creatorId?.fullName && (
                                  <p className="text-xs opacity-70">
                                    Creator: {alert.creatorId.fullName}
                                  </p>
                                )}
                                <p className="text-[11px] opacity-50">
                                  {new Date(alert.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleResolveAlert(alert._id)}
                              size="sm"
                              variant="outline"
                              className="border-current text-current hover:bg-white/10 flex-shrink-0 text-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Resolve
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
