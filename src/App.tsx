import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "./components/AuthGuard";
import { ChannelProvider } from "./context/ChannelContext";
import Index from "./pages/Index.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import PipelinePageRoute from "./pages/PipelinePageRoute.tsx";
import VideoEditorPage from "./pages/VideoEditorPage.tsx";
import NichesPage from "./pages/NichesPage.tsx";
import RevenuePage from "./pages/RevenuePage.tsx";
import AIEnginePage from "./pages/AIEnginePage.tsx";
import SetupPage from "./pages/SetupPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import YouTubeChannelPage from "./pages/YouTubeChannelPage.tsx";
import CodeAuditorPage from "./pages/CodeAuditorPage.tsx";
import StrategyPage from "./pages/StrategyPage.tsx";
import CompetitorPage from "./pages/CompetitorPage.tsx";
import KeywordResearchPage from "./pages/KeywordResearchPage.tsx";
import ChannelsPage from "./pages/ChannelsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthGuard>
        <ChannelProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />}>
                <Route index element={<DashboardPage />} />
                <Route path="pipeline" element={<PipelinePageRoute />} />
                <Route path="video-editor" element={<VideoEditorPage />} />
                <Route path="video-editor/:videoId" element={<VideoEditorPage />} />
                <Route path="niches" element={<NichesPage />} />
                <Route path="revenue" element={<RevenuePage />} />
                <Route path="ai-engine" element={<AIEnginePage />} />
                <Route path="youtube-channel" element={<YouTubeChannelPage />} />
                <Route path="setup" element={<SetupPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="code-auditor" element={<CodeAuditorPage />} />
                <Route path="strategy" element={<StrategyPage />} />
                <Route path="competitors" element={<CompetitorPage />} />
                <Route path="keywords" element={<KeywordResearchPage />} />
                <Route path="channels" element={<ChannelsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ChannelProvider>
      </AuthGuard>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
