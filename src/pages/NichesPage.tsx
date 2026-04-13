import { NicheAnalyzer } from "@/components/dashboard/NicheAnalyzer";
import { TrendScanner } from "@/components/dashboard/TrendScanner";

const NichesPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">NICHE INTEL</h1>
        <p className="text-muted-foreground">Analyze market gaps and high-potential niches.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NicheAnalyzer />
        <TrendScanner />
      </div>
    </div>
  );
};

export default NichesPage;
