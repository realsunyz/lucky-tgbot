import { useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Hash, UserRoundPlus, TriangleAlert } from "lucide-react";

import { useLotteryData } from "@/hooks/useLotteryData";
import { useParticipantActions } from "@/hooks/useParticipantActions";
import {
  DrawActions,
  ParticipantsTable,
  PrizesCard,
  EditLotterySkeleton,
} from "@/components/edit-lottery";

export default function EditLotteryPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // Data fetching hook
  const { lottery, participants, loading, error, loadData, setParticipants } =
    useLotteryData({ id, token });

  // Participant actions hook
  const { isDrawing, handleRemoveParticipant, handleDraw } =
    useParticipantActions({
      id,
      token,
      prizes: lottery?.prizes || [],
      onDataUpdate: loadData,
      onParticipantRemoved: (userId) =>
        setParticipants((prev) => prev.filter((p) => p.user_id !== userId)),
    });

  // Error states
  if (id && !token) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>无效链接</AlertTitle>
          <AlertDescription>
            请从 Telegram Bot 获取有效的编辑链接
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return <EditLotterySkeleton />;
  }

  if (error || !lottery) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>
            {error || "无效的 Token 或抽奖不存在"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (lottery.status !== "active") {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background p-4">
        <Alert className="w-full max-w-md border-yellow-500/50 text-yellow-600 dark:text-yellow-500 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-500">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>无法编辑</AlertTitle>
          <AlertDescription>
            {lottery.status === "draft"
              ? "该抽奖处于草稿状态。请使用创建链接完成设置。"
              : "该抽奖已结束，无法进行编辑或管理。"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 flex justify-center w-full">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-3 justify-center sm:justify-start">
            <h1 className="text-3xl font-bold">{lottery.title}</h1>
            <Badge className="hidden sm:inline-flex bg-green-600 hover:bg-green-700 text-white">
              进行中
            </Badge>
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column: Actions */}
          <div className="space-y-6">
            <DrawActions
              lottery={lottery}
              lotteryId={id!}
              token={token!}
              onDraw={handleDraw}
              isDrawing={isDrawing}
              disabled={participants.length === 0}
              onUpdate={loadData}
            />
          </div>

          {/* Right Column: Participants */}
          <div className="lg:col-span-2 space-y-6">
            <PrizesCard
              lottery={lottery}
              lotteryId={id!}
              token={token!}
              onUpdate={loadData}
            />
            <ParticipantsTable
              participants={participants}
              prizes={lottery.prizes || []}
              lotteryId={id!}
              token={token!}
              onDelete={handleRemoveParticipant}
              onDataUpdate={loadData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
