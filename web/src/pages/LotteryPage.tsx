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
import {
  Trophy,
  Gift,
  Clock,
  Hash,
  UserRoundPlus,
  ListCollapse,
  BadgeCheck,
} from "lucide-react";
import { getErrorMessage, UI_MESSAGES } from "@/utils/errors";
import { ErrorDisplay } from "@/components/ui/error-display";
import { LoadingDisplay } from "@/components/ui/loading-display";

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
    return <LoadingDisplay />;
  }

  if (error || !lottery) {
    return (
      <ErrorDisplay
        title={UI_MESSAGES.LOAD_FAILED_TITLE}
        description={UI_MESSAGES.INVALID_LOTTERY_ID}
      />
    );
  }

  if (lottery.status === "draft") {
    return (
      <ErrorDisplay
        variant="warning"
        title={UI_MESSAGES.NOT_PUBLISHED_TITLE}
        description={UI_MESSAGES.NOT_PUBLISHED_WAIT_DESC}
      />
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-0 h-[28px] font-normal text-sm border-transparent rounded-full">
            草稿
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-0 h-[28px] font-normal text-sm border-transparent rounded-full">
            进行中
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-0 h-[28px] font-normal text-sm border-transparent rounded-full">
            已开奖
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="px-3 py-0 h-[28px] font-normal text-sm rounded-full"
          >
            {status}
          </Badge>
        );
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
  const winnerCountByPrizeId = new Map<number, number>();
  const winnerCountByPrizeName = new Map<string, number>();
  (lottery.winners || []).forEach((winner) => {
    winnerCountByPrizeId.set(
      winner.prize_id,
      (winnerCountByPrizeId.get(winner.prize_id) || 0) + 1,
    );
    winnerCountByPrizeName.set(
      winner.prize_name,
      (winnerCountByPrizeName.get(winner.prize_name) || 0) + 1,
    );
  });
  const failedPrizes =
    lottery.status === "completed"
      ? lottery.prizes
          .map((prize) => {
            const wonCount =
              prize.id != null
                ? winnerCountByPrizeId.get(prize.id) || 0
                : winnerCountByPrizeName.get(prize.name) || 0;
            const failedCount = Math.max(prize.quantity - wonCount, 0);
            return { ...prize, failedCount };
          })
          .filter((prize) => prize.failedCount > 0)
      : [];
  const failedCountByPrizeKey = new Map<string, number>();
  failedPrizes.forEach((prize) => {
    const key = prize.id != null ? `id:${prize.id}` : `name:${prize.name}`;
    failedCountByPrizeKey.set(key, prize.failedCount);
  });
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
          <div className="lg:col-span-2 space-y-6">
            <Card className="gap-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <ListCollapse className="w-5 h-5" /> 抽奖详情
                  </div>
                  <div className="flex items-center">
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
                  {lottery.prizes.map((prize, index) => {
                    const failedCount =
                      failedCountByPrizeKey.get(
                        prize.id != null
                          ? `id:${prize.id}`
                          : `name:${prize.name}`,
                      ) || 0;
                    return (
                      <div
                        key={prize.id || index}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <span className="font-medium">{prize.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-sm px-3 py-0.5"
                          >
                            × {prize.quantity}
                          </Badge>
                          {lottery.status === "completed" &&
                            failedCount > 0 && (
                              <Badge className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-0.5">
                                流标 × {failedCount}
                              </Badge>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="gap-2">
              <CardHeader>
                <div className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" /> 中奖者列表
                  </CardTitle>
                  <div
                    className={`flex items-center gap-2 px-3 py-0 h-[28px] rounded-full transition-colors font-normal text-sm border border-transparent shrink-0 ${getWinRateStyles()}`}
                  >
                    <span className="hidden sm:inline">
                      参与人数: {participantCount}
                    </span>
                    <span className="hidden sm:inline w-px h-3 bg-current opacity-50" />
                    <span className="sm:hidden">
                      综合中奖率: {getWinRateText()}
                    </span>
                    <span className="hidden sm:inline">
                      综合中奖率: {getWinRateText()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md overflow-hidden">
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
                      lottery.winners.length > 0
                        ? lottery.winners.map((winner) => (
                            <TableRow key={winner.id} className="h-12">
                              <TableCell className="font-mono text-muted-foreground">
                                {winner.user_id}
                              </TableCell>
                              <TableCell className="text-right">
                                {winner.prize_name}
                              </TableCell>
                            </TableRow>
                          ))
                        : lottery.status === "completed" &&
                          failedPrizes.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className="text-center py-12 text-muted-foreground"
                              >
                                暂无中奖记录
                              </TableCell>
                            </TableRow>
                          )}

                      {lottery.status === "completed" &&
                        failedPrizes.flatMap((prize, index) =>
                          Array.from({ length: prize.failedCount }).map(
                            (_, i) => (
                              <TableRow
                                key={`failed-${prize.id || prize.name}-${index}-${i}`}
                                className="h-12"
                              >
                                <TableCell className="font-mono text-red-500">
                                  NO WINNER
                                </TableCell>
                                <TableCell className="text-right">
                                  {prize.name}
                                </TableCell>
                              </TableRow>
                            ),
                          ),
                        )}

                      {lottery.status !== "completed" && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center py-12 text-muted-foreground"
                          >
                            尚未开奖, 敬请期待
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

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
