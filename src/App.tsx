import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import OrderNumber from "./pages/OrderNumber";
import NumberAuthorization from "./pages/NumberAuthorization";
import Statistics from "./pages/Statistics";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full bg-background">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <Header />
                      <main className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/order-number" element={<OrderNumber />} />
                          <Route path="/configuration/account" element={<div className="p-6">Configuration du compte</div>} />
                          <Route path="/configuration/authorizations" element={<NumberAuthorization />} />
                          <Route path="/configuration/trunks" element={<div className="p-6">Gestion des trunks</div>} />
                          <Route path="/configuration/users" element={<div className="p-6">Gestion des utilisateurs</div>} />
                          <Route path="/finances/recharge" element={<div className="p-6">Recharge de compte</div>} />
                          <Route path="/finances/history" element={<div className="p-6">Historique des recharges</div>} />
                          <Route path="/finances/pricing" element={<div className="p-6">Liste de prix</div>} />
                          <Route path="/rapport/outbound" element={<div className="p-6">Appels sortants</div>} />
                          <Route path="/rapport/inbound" element={<div className="p-6">Appels entrants</div>} />
                          <Route path="/rapport/statistics" element={<Statistics />} />
                          <Route path="/campagnes" element={<div className="p-6">Gestion des campagnes</div>} />
                          <Route path="/plugins" element={<div className="p-6">Gestion des plugins</div>} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;