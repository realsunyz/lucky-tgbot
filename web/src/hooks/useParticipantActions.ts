import { useState } from "react";
import { toast } from "sonner";
import {
  updateParticipantWeight,
  updatePrizeWeight,
  removeParticipant,
  drawLottery,
  type Participant,
  type Prize,
} from "@/api/lottery";

interface UseParticipantActionsOptions {
  id: string | undefined;
  token: string | null;
  prizes: Prize[];
  onDataUpdate: () => Promise<void>;
  onParticipantRemoved: (userId: number) => void;
}

export function useParticipantActions({
  id,
  token,
  prizes,
  onDataUpdate,
  onParticipantRemoved,
}: UseParticipantActionsOptions) {
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleSaveWeight = async (
    participant: Participant,
    globalWeight: number,
    prizeWeights: Record<number, number>,
  ) => {
    if (!id || !token) return;

    if (isNaN(globalWeight) || globalWeight < 0) {
      toast.error("全局权重必须大于等于 0");
      return;
    }

    setIsSavingWeight(true);
    try {
      // Update global weight
      await updateParticipantWeight(
        id,
        participant.user_id,
        globalWeight,
        token,
      );

      // Update prize specific weights
      for (const prize of prizes) {
        if (!prize.id) continue;
        const pw = prizeWeights[prize.id];
        if (pw !== undefined && !isNaN(pw) && pw >= 0) {
          await updatePrizeWeight(id, participant.user_id, prize.id, pw, token);
        }
      }

      await onDataUpdate();
      toast.success("权重已更新");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失败");
      return false;
    } finally {
      setIsSavingWeight(false);
    }
  };

  const handleRemoveParticipant = async (participant: Participant) => {
    if (!id || !token) return;

    try {
      await removeParticipant(id, participant.user_id, token);
      onParticipantRemoved(participant.user_id);
      toast.success("已移除参与者");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "移除失败");
    }
  };

  const handleDraw = async () => {
    if (!id || !token) return;

    setIsDrawing(true);
    try {
      const result = await drawLottery(id, token);
      toast.success(`开奖成功！共 ${result.winners?.length || 0} 人中奖`);
      await onDataUpdate();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "开奖失败");
      return false;
    } finally {
      setIsDrawing(false);
    }
  };

  return {
    isSavingWeight,
    isDrawing,
    handleSaveWeight,
    handleRemoveParticipant,
    handleDraw,
  };
}
