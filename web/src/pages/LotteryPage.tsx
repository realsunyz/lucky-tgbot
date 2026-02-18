import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLottery, type LotteryResponse } from "@/api/lottery";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Trophy,
  Gift,
  Clock,
  Hash,
  UserRoundPlus,
  ListCollapse,
  AlertCircle,
  TriangleAlert,
  BadgeCheck,
} from "lucide-react";
import { getErrorMessage } from "@/utils/errors";

function isAbortError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: string }).name === "AbortError"
  );
}

export default function LotteryPage() {
  const { id } = useParams<{ id: string }>();
  const [lottery, setLottery] = useState<LotteryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getLottery(id, controller.signal)
      .then(setLottery)
      .catch((err) => {
        if (isAbortError(err)) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !lottery) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{error || "未找到该抽奖"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (lottery.status === "draft") {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background p-4">
        <Alert className="w-full max-w-md border-yellow-500/50 text-yellow-600 dark:text-yellow-500 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-500">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>抽奖未发布</AlertTitle>
          <AlertDescription>
            该抽奖处于草稿状态，尚未发布。请联系发布者完成创建。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge className="bg-slate-500 hover:bg-slate-600 text-white">
            草稿
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white">
            进行中
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-slate-500 hover:bg-slate-600 text-white">
            已开奖
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDrawModeText = (mode: string) => {
    switch (mode) {
      case "manual":
        return "手动开奖";
      case "timed":
        return "定时开奖";
      case "full":
        return "满人开奖";
      default:
        return mode;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPrizes = lottery.prizes.reduce((acc, p) => acc + p.quantity, 0);
  const participantCount = lottery.participant_count || 0;
  const winRateValue =
    participantCount > 0
      ? Math.min((totalPrizes / participantCount) * 100, 100)
      : 0;
  const winRate = winRateValue.toFixed(2);

  const getWinRateStyles = () => {
    if (winRateValue === 0) return "bg-muted/50 text-muted-foreground";
    if (winRateValue < 30) return "bg-red-500 text-white";
    if (winRateValue < 60) return "bg-yellow-500 text-white";
    if (winRateValue < 90) return "bg-lime-500 text-white";
    return "bg-green-600 text-white";
  };

  const getWinRateText = () => {
    if (winRateValue === 0) return "N/A";
    return `${winRate}%`;
  };

  return (
    <div className="py-8 px-4 flex justify-center w-full">
      <div className="w-full max-w-6xl space-y-6">
        <div className="text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-3 justify-center sm:justify-start">
            <h1 className="text-3xl font-bold">{lottery.title}</h1>
            <div className="hidden sm:block">
              {getStatusBadge(lottery.status)}
            </div>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-4 sm:gap-6 justify-center items-center sm:justify-start text-sm">
            <span className="flex items-center gap-1.5">
              <Hash className="w-4 h-4" />
              <span>
                编号{" "}
                <span className="font-mono text-primary font-medium">
                  {lottery.id}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <UserRoundPlus className="w-4 h-4" />
              <span>
                发布者{" "}
                <span className="font-mono text-primary font-medium">
                  {lottery.creator_id}
                </span>
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column: Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="gap-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <ListCollapse className="w-5 h-5" /> 抽奖详情
                  </div>
                  <div className="sm:hidden flex items-center">
                    {getStatusBadge(lottery.status)}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lottery.description ? (
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {lottery.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">暂无详细说明</p>
                )}
              </CardContent>
            </Card>

            <Card className="gap-2">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" /> 奖品列表
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {lottery.prizes.map((prize, index) => (
                    <div
                      key={prize.id || index}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors shadow-sm"
                    >
                      <span className="font-medium">{prize.name}</span>
                      <Badge
                        variant="secondary"
                        className="text-sm px-3 py-0.5"
                      >
                        × {prize.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Winners / Participants Card */}
            <Card className="gap-2">
              <CardHeader>
                <div className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" /> 中奖者列表
                  </CardTitle>
                  <div
                    className={`flex items-center gap-2 text-xs sm:text-sm px-3 py-1.5 rounded-full transition-colors ${getWinRateStyles()}`}
                  >
                    <span className="hidden sm:inline">
                      参与人数: {participantCount}
                    </span>
                    <span className="hidden sm:inline w-px h-3 bg-current opacity-50" />
                    <span className="sm:hidden">
                      预计中奖率: {getWinRateText()}
                    </span>
                    <span className="hidden sm:inline">
                      预计中奖率: {getWinRateText()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead className="text-right">获得奖品</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lottery.status === "completed" &&
                    lottery.winners &&
                    lottery.winners.length > 0 ? (
                      lottery.winners.map((winner) => (
                        <TableRow key={winner.id}>
                          <TableCell className="font-mono text-muted-foreground">
                            {winner.user_id}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                            >
                              {winner.prize_name}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="text-center py-12 text-muted-foreground"
                        >
                          {lottery.status === "completed"
                            ? "本期抽奖暂无中奖记录"
                            : "尚未开奖，敬请期待"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-6">
            <Card className="gap-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5" /> 开奖条件
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <span className="text-sm font-medium">创建时间</span>
                  <span className="font-mono text-sm">
                    {formatDate(lottery.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                  <span className="text-sm font-medium">开奖模式</span>
                  <span className="font-mono text-sm flex items-center gap-1">
                    {getDrawModeText(lottery.draw_mode)}
                    {lottery.is_weights_disabled && (
                      <BadgeCheck className="w-4 h-4 text-green-500 fill-green-500/10" />
                    )}
                  </span>
                </div>
                {lottery.draw_mode === "timed" && lottery.draw_time && (
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <span className="text-sm font-medium">开奖时间</span>
                    <span className="font-mono text-sm text-right">
                      {formatDate(lottery.draw_time)}
                    </span>
                  </div>
                )}
                {lottery.draw_mode === "full" && lottery.max_entries && (
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <span className="text-sm font-medium">满人数量</span>
                    <span className="font-mono text-sm">
                      {lottery.max_entries} 人
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="p-4 rounded-lg bg-muted text-center text-sm text-muted-foreground">
              <p>请通过 Telegram Bot 参与此抽奖</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
