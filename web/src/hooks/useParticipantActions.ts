import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { getErrorMessage } from "@/utils/errors";
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
  onDrawSuccess?: () => void;
}

export function useParticipantActions({
  id,
  token,
  prizes,
  onDataUpdate,
  onParticipantRemoved,
  onDrawSuccess,
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
      toast.success("权重更新成功");
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
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
      toast.success("参与者移除成功");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDraw = async () => {
    if (!id || !token) return;

    setIsDrawing(true);
    try {
      await drawLottery(id, token);
      toast.success("开奖成功");

      if (onDrawSuccess) {
        onDrawSuccess();
      } else {
        await onDataUpdate();
      }
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
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
