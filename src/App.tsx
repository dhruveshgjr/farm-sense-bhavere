import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import ResearchPage from "./pages/ResearchPage";
import MarketPage from "./pages/MarketPage";
import SettingsPage from "./pages/SettingsPage";
import DataImportPage from "./pages/DataImportPage";
import ReportPrint from "./pages/ReportPrint";
import NotFound from "./pages/NotFound";
import { initClientCron } from "./lib/cronManager";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function CronInit() {
  useEffect(() => {
    initClientCron();
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CronInit />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/today" element={<Navigate to="/" replace />} />
          <Route path="/advisory" element={<Navigate to="/research" replace />} />
          <Route path="/history" element={<Navigate to="/market" replace />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/import" element={<DataImportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/report-print" element={<ReportPrint />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
