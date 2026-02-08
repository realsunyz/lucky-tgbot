import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings2, Gift, Users } from "lucide-react";
import type { LotteryResponse } from "@/api/lottery";

interface StatsCardProps {
  lottery: LotteryResponse;
  participantCount: number;
  showMobileBadge?: boolean;
}

export function StatsCard({
  lottery,
  participantCount,
  showMobileBadge = false,
}: StatsCardProps) {
  const getDrawModeLabel = (mode: string) => {
    switch (mode) {
      case "manual":
        return "手动";
      case "timed":
        return "定时";
      case "full":
        return "满人";
      default:
        return mode;
    }
  };

  const totalPrizes =
    lottery.prizes?.reduce((sum, p) => sum + p.quantity, 0) || 0;

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>统计信息</span>
          {showMobileBadge && (
            <Badge className="sm:hidden bg-green-600 hover:bg-green-700 text-white">
              进行中
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b last:border-0">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> 模式
          </span>
          <span className="font-medium">
            {getDrawModeLabel(lottery.draw_mode)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b last:border-0">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Gift className="w-4 h-4" /> 奖品
          </span>
          <span className="font-medium">{totalPrizes} 个</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b last:border-0">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4" /> 参与
          </span>
          <span className="font-medium">{participantCount} 人</span>
        </div>
      </CardContent>
    </Card>
  );
}
