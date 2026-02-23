import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  FileText,
  Server,
  AlertCircle,
  Loader2,
  BarChart3,
  Database,
  AlarmClock,
  CalendarPlus2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingDisplay } from "@/components/ui/loading-display";
import { getLotteryStats, checkHealth, type LotteryStats } from "@/api/lottery";
import { Badge } from "@/components/ui/badge";

interface HealthStatus {
  live: boolean | "checking";
  ready: boolean | "checking";
}

const StatBox = ({
  title,
  value,
  icon: Icon,
  className = "",
}: {
  title: string;
  value: string | number;
  icon: any;
  className?: string;
}) => (
  <Card className="border shadow-none">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 text-muted-foreground ${className}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const HealthBadge = ({ status }: { status: boolean | "checking" }) => {
  if (status === "checking") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 检查中
      </Badge>
    );
  }
  if (status) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
        <CheckCircle2 className="mr-1 h-3 w-3" /> 正常
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <AlertCircle className="mr-1 h-3 w-3" /> 异常
    </Badge>
  );
};

export default function StatusPage() {
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [health, setHealth] = useState<HealthStatus>({
    live: "checking",
    ready: "checking",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Parallel fetch
      const [liveRes, readyRes, statsRes] = await Promise.all([
        checkHealth("/livez"),
        checkHealth("/readyz"),
        getLotteryStats(),
      ]);

      setHealth({ live: liveRes, ready: readyRes });
      setStats(statsRes);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load status data");
      setHealth({ live: false, ready: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !stats) {
    return <LoadingDisplay />;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight">系统状态</h1>
        <p className="text-muted-foreground mt-1">平台实时运行状况</p>
      </div>

      {error && (
        <Card className="border-red-500/50 bg-red-500/10 shadow-none">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center text-base">
              <AlertCircle className="w-5 h-5 mr-2" />
              连接错误
            </CardTitle>
            <CardDescription className="text-red-500/80">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="shadow-none overflow-hidden p-0 border">
        <div className="divide-y bg-card text-card-foreground">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  API 健康检查
                  <span className="text-xs text-muted-foreground font-normal">
                    /livez
                  </span>
                </p>
              </div>
            </div>
            <HealthBadge status={health.live} />
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  数据库健康检查
                  <span className="text-xs text-muted-foreground font-normal">
                    /readyz
                  </span>
                </p>
              </div>
            </div>
            <HealthBadge status={health.ready} />
          </div>
        </div>
      </Card>

      {stats && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            统计信息
          </h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            <StatBox
              title="总抽奖数"
              value={stats.total_count}
              icon={Activity}
            />
            <StatBox
              title="今日新增"
              value={stats.today_count}
              icon={CalendarPlus2}
            />
            <StatBox
              title="定时待开奖"
              value={stats.scheduled_count}
              icon={AlarmClock}
            />
            <StatBox title="草稿箱" value={stats.draft_count} icon={FileText} />
            <StatBox title="进行中" value={stats.active_count} icon={Clock} />
            <StatBox
              title="已开奖"
              value={stats.completed_count}
              icon={CheckCircle2}
            />
          </div>
        </div>
      )}
    </div>
  );
}
