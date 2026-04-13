import { DollarSign, Eye, Film, TrendingUp, Users, Zap } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendScanner } from "@/components/dashboard/TrendScanner";
import { ContentPipeline } from "@/components/dashboard/ContentPipeline";
import { NicheAnalyzer } from "@/components/dashboard/NicheAnalyzer";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { AIEngineStatus } from "@/components/dashboard/AIEngineStatus";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

const DashboardPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Daily Revenue" value="$2,847" change="+23.5% vs yesterday" changeType="positive" icon={DollarSign} />
        <MetricCard title="Videos Live" value="847" change="+3 today" changeType="positive" icon={Film} />
        <MetricCard title="Total Views" value="4.2M" change="+180K today" changeType="positive" icon={Eye} />
        <MetricCard title="Subscribers" value="124K" change="+892 today" changeType="positive" icon={Users} />
        <MetricCard title="Trends Found" value="23" change="6 high-value" changeType="positive" icon={TrendingUp} />
        <MetricCard title="Auto Rate" value="98.4%" change="Near full autonomy" changeType="positive" icon={Zap} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RevenueChart />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TrendScanner />
            <ContentPipeline />
          </div>
        </div>
        <div className="space-y-6">
          <AIEngineStatus />
          <NicheAnalyzer />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
