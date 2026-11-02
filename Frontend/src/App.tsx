
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import React from "react";
import { BackendAuthProvider } from "@/hooks/useBackendAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import ProfileSetup from "./pages/ProfileSetup";
import Cre8Echo from "./pages/Cre8Echo";
import Dashboard from "./pages/Dashboard";
import Cre8Studio from "./pages/Cre8Studio";
import Cre8Store from "./pages/Cre8Store";
import PublicStore from "./pages/PublicStore";
import AdminDashboard from "./pages/AdminDashboard";
import Cre8Agent from "./pages/Cre8Agent";
import AgencyDashboard from "./pages/AgencyDashboard";
import Cre8Campaigns from "./pages/Cre8Campaigns";
import ResetPassword from "./pages/ResetPassword";
const queryClient = new QueryClient();

const App = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
        <TooltipProvider>
          <BackendAuthProvider>
            <div className="min-h-screen">
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/signin" element={
                    <ProtectedRoute requireAuth={false}>
                      <SignIn />
                    </ProtectedRoute>
                  } />
                  <Route path="/signup" element={
                    <ProtectedRoute requireAuth={false}>
                      <SignUp />
                    </ProtectedRoute>
                  } />
                  <Route path="/reset-password/:token" element={
                    <ProtectedRoute requireAuth={false}>
                      <ResetPassword />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute requireAuth={true}>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile-setup" element={
                    <ProtectedRoute requireAuth={true}>
                      <ProfileSetup />
                    </ProtectedRoute>
                  } />
                  <Route path="/cre8echo" element={
                    <ProtectedRoute requireAuth={true}>
                      <Cre8Echo />
                    </ProtectedRoute>
                  } />
                  <Route path="/studio" element={
                    <ProtectedRoute requireAuth={true}>
                      <Cre8Studio />
                    </ProtectedRoute>
                  } />
                  <Route path="/store" element={
                    <ProtectedRoute requireAuth={true}>
                      <Cre8Store />
                    </ProtectedRoute>
                  } />
                  <Route path="/store/:creatorId" element={<PublicStore />} />
                  <Route path="/store/checkout/mock" element={<PublicStore mode="mock_checkout" />} />
                  <Route path="/store/success" element={<PublicStore mode="success" />} />
                  <Route path="/admin" element={
                    <ProtectedRoute requireAuth={true}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/agent" element={
                    <ProtectedRoute requireAuth={true}>
                      <Cre8Agent />
                    </ProtectedRoute>
                  } />
                  <Route path="/agency" element={
                    <ProtectedRoute requireAuth={true}>
                      <AgencyDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/campaigns" element={
                    <ProtectedRoute requireAuth={true}>
                      <Cre8Campaigns />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster />
                <Sonner />
              </BrowserRouter>
            </div>
          </BackendAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

export default App;
