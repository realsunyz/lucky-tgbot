import { useState, useEffect, useCallback } from "react";
import {
  getLottery,
  getParticipants,
  type Participant,
  type LotteryResponse,
} from "@/api/lottery";
import { getErrorMessage } from "@/utils/errors";

interface UseLotteryDataOptions {
  id: string | undefined;
  token: string | null;
}

interface UseLotteryDataReturn {
  lottery: LotteryResponse | null;
  participants: Participant[];
  loading: boolean;
  error: string | null;
  loadData: () => Promise<void>;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
}

export function useLotteryData({
  id,
  token,
}: UseLotteryDataOptions): UseLotteryDataReturn {
  const [lottery, setLottery] = useState<LotteryResponse | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id || !token) return;

    try {
      const [lotteryData, participantsData] = await Promise.all([
        getLottery(id),
        getParticipants(id, token),
      ]);
      setLottery(lotteryData);
      setParticipants(participantsData || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    lottery,
    participants,
    loading,
    error,
    loadData,
    setParticipants,
  };
}
