import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";
import { auth } from "@/firebase";
import { Search, TrendingUp, DollarSign, ChevronUp, ChevronDown, Play, Loader2, AlertCircle } from "lucide-react";

interface Keyword {
  query: string;
  estimatedMonthlySearches: string;
  competitionLevel: "low" | "medium" | "high";
  rpmPotential: string;
  videoAngle: string;
  thumbnailConcept: string;
}

type SortField = "query" | "competitionLevel" | "rpmPotential" | "estimatedMonthlySearches";
type SortDir = "asc" | "desc";

const NICHES = ["Tech & AI", "Finance & Crypto", "Health & Wellness", "Self Improvement", "Business & Entrepreneurship", "Science & Education"];
const COMPETITION_ORDER = { low: 0, medium: 1, high: 2 };
const COMPETITION_COLORS = {
  low: "text-green-400 bg-green-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  high: "text-red-400 bg-red-400/10",
};

export default function KeywordResearchPage() {
  const navigate = useNavigate();
  const [niche, setNiche] = useState("Tech & AI");
  const [channelSize, setChannelSize] = useState<"new" | "growing" | "established">("new");
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("competitionLevel");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const runResearch = async () => {
    setLoading(true);
    setError(null);
    setKeywords([]);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be signed in.");
      const idToken = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/strategy/keyword-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ niche, channelSize }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (err: any) {
      setError(err.message || "Research failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = [...keywords].sort((a, b) => {
    let cmp = 0;
    if (sortField === "competitionLevel") {
      cmp = COMPETITION_ORDER[a.competitionLevel] - COMPETITION_ORDER[b.competitionLevel];
    } else if (sortField === "rpmPotential") {
      const aVal = parseFloat(a.rpmPotential.replace(/[^0-9.]/g, "") || "0");
      const bVal = parseFloat(b.rpmPotential.replace(/[^0-9.]/g, "") || "0");
      cmp = aVal - bVal;
    } else {
      cmp = (a[sortField] || "").localeCompare(b[sortField] || "");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-orange-400" /> : <ChevronDown className="w-3 h-3 text-orange-400" />;
  };

  const handleGenerateVideo = (kw: Keyword) => {
    navigate(`/pipeline?prefill=${encodeURIComponent(JSON.stringify({ title: kw.query, niche, videoAngle: kw.videoAngle, thumbnailConcept: kw.thumbnailConcept }))}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Search className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Keyword Research Engine</h1>
              <p className="text-gray-400 text-sm">20 evergreen, low-competition YouTube search queries per niche</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Niche</label>
              <select
                value={niche}
                onChange={e => setNiche(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              >
                {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">Channel Size</label>
              <select
                value={channelSize}
                onChange={e => setChannelSize(e.target.value as "new" | "growing" | "established")}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="new">New (0 subscribers)</option>
                <option value="growing">Growing (1K–10K)</option>
                <option value="established">Established (10K+)</option>
              </select>
            </div>
            <button
              onClick={runResearch}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Researching..." : "Run Research"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Generating 20 evergreen keywords for <span className="text-white">{niche}</span>...</p>
            <p className="text-gray-600 text-xs mt-1">This takes ~10 seconds</p>
          </div>
        )}

        {/* Results Table */}
        {!loading && keywords.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <span className="text-white font-medium">{keywords.length} Keywords Found</span>
                <span className="text-gray-500 text-sm">— {niche} · {channelSize} channel</span>
              </div>
              <span className="text-gray-500 text-xs">Click column headers to sort</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium w-8">#</th>
                    <th
                      className="text-left px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                      onClick={() => handleSort("query")}
                    >
                      <div className="flex items-center gap-1">Search Query <SortIcon field="query" /></div>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white whitespace-nowrap"
                      onClick={() => handleSort("estimatedMonthlySearches")}
                    >
                      <div className="flex items-center gap-1">Monthly Searches <SortIcon field="estimatedMonthlySearches" /></div>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                      onClick={() => handleSort("competitionLevel")}
                    >
                      <div className="flex items-center gap-1">Competition <SortIcon field="competitionLevel" /></div>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white whitespace-nowrap"
                      onClick={() => handleSort("rpmPotential")}
                    >
                      <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" />RPM <SortIcon field="rpmPotential" /></div>
                    </th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Video Angle</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((kw, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors group">
                      <td className="px-4 py-3 text-gray-600">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{kw.query}</div>
                        <div className="text-gray-500 text-xs mt-0.5 max-w-xs truncate">{kw.thumbnailConcept}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{kw.estimatedMonthlySearches}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${COMPETITION_COLORS[kw.competitionLevel] || "text-gray-400 bg-gray-400/10"}`}>
                          {kw.competitionLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-green-400 font-medium whitespace-nowrap">{kw.rpmPotential}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">
                        <span className="line-clamp-2">{kw.videoAngle}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleGenerateVideo(kw)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                        >
                          <Play className="w-3 h-3" />
                          Generate Video
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && keywords.length === 0 && !error && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Search className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Select a niche and click <span className="text-white">Run Research</span> to generate 20 evergreen keywords</p>
          </div>
        )}
      </div>
    </div>
  );
}
