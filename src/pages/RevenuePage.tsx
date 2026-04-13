import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DollarSign, TrendingUp } from "lucide-react";

const RevenuePage = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">REVENUE DASHBOARD</h1>
        <p className="text-muted-foreground">Track your earnings and growth projections.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard title="Total Revenue" value="$42,847" change="+12.5% this month" changeType="positive" icon={DollarSign} />
        <MetricCard title="Avg. RPM" value="$18.50" change="Stable" changeType="positive" icon={TrendingUp} />
      </div>
      <RevenueChart />
    </div>
  );
};

export default RevenuePage;
