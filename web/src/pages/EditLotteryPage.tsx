import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Hash, UserRoundPlus } from "lucide-react";
import { UI_MESSAGES } from "@/utils/errors";

import { useLotteryData } from "@/hooks/useLotteryData";
import { useParticipantActions } from "@/hooks/useParticipantActions";
import {
  DrawActions,
  ParticipantsTable,
  PrizesCard,
  EditLotterySkeleton,
} from "@/components/edit-lottery";
import { ErrorDisplay } from "@/components/ui/error-display";

export default function EditLotteryPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // Data fetching hook
  const { lottery, participants, loading, error, loadData, setParticipants } =
    useLotteryData({ id, token });

  const navigate = useNavigate();

  // Participant actions hook
  const { isDrawing, handleRemoveParticipant, handleDraw } =
    useParticipantActions({
      id,
      token,
      prizes: lottery?.prizes || [],
      onDataUpdate: loadData,
      onParticipantRemoved: (userId) =>
        setParticipants((prev) => prev.filter((p) => p.user_id !== userId)),
      onDrawSuccess: () => navigate(`/lottery/${id}`),
    });

  // Error states
  if (id && !token) {
    return (
      <ErrorDisplay
        title={UI_MESSAGES.LOAD_FAILED_TITLE}
        description={UI_MESSAGES.INVALID_EDIT_TOKEN}
      />
    );
  }

  if (loading) {
    return <EditLotterySkeleton />;
  }

  if (error || !lottery) {
    return (
      <ErrorDisplay
        title={UI_MESSAGES.LOAD_FAILED_TITLE}
        description={UI_MESSAGES.INVALID_EDIT_TOKEN}
      />
    );
  }

  if (lottery.status !== "active") {
    return (
      <ErrorDisplay
        title={UI_MESSAGES.LOAD_FAILED_TITLE}
        description={UI_MESSAGES.INVALID_EDIT_TOKEN}
      />
    );
  }

  return (
    <div className="py-8 px-4 flex justify-center w-full">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-3 justify-center sm:justify-between w-full">
            <h1 className="text-3xl font-bold">{lottery.title}</h1>
            <Badge className="bg-green-600 hover:bg-green-700 text-white mt-2 sm:mt-0 px-3 py-0 h-[28px] font-normal text-sm border-transparent rounded-full">
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
              isWeightsDisabled={
                searchParams.get("lucky") === "true"
                  ? false
                  : lottery.is_weights_disabled
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
