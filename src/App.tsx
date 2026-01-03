import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import Dashboard from "./pages/Dashboard";
import OrderNumber from "./pages/OrderNumber";
import { SignupForm } from "@/components/auth/SignupForm";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/signup" element={<SignupForm />} />
          <Route path="*" element={
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
                      <Route path="/configuration/trunks" element={<div className="p-6">Gestion des trunks</div>} />
                      <Route path="/configuration/users" element={<div className="p-6">Gestion des utilisateurs</div>} />
                      <Route path="/finances/recharge" element={<div className="p-6">Recharge de compte</div>} />
                      <Route path="/finances/history" element={<div className="p-6">Historique des recharges</div>} />
                      <Route path="/campagnes" element={<div className="p-6">Gestion des campagnes</div>} />
                      <Route path="/plugins" element={<div className="p-6">Gestion des plugins</div>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </SidebarProvider>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;