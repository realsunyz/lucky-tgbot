import { useState, useEffect, useCallback, useRef } from "react";
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
  loadData: (options?: { signal?: AbortSignal }) => Promise<void>;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
}

function isAbortError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: string }).name === "AbortError"
  );
}

export function useLotteryData({
  id,
  token,
}: UseLotteryDataOptions): UseLotteryDataReturn {
  const [lottery, setLottery] = useState<LotteryResponse | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadData = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      const signal = options?.signal;
      if (!id || !token) {
        setLottery(null);
        setParticipants([]);
        setLoading(false);
        return;
      }

      const requestId = ++requestIdRef.current;

      try {
        const [lotteryData, participantsData] = await Promise.all([
          getLottery(id, signal),
          getParticipants(id, token, signal),
        ]);

        if (signal?.aborted || requestId !== requestIdRef.current) return;
        setError(null);
        setLottery(lotteryData);
        setParticipants(participantsData || []);
      } catch (err) {
        if (isAbortError(err) || requestId !== requestIdRef.current) return;
        setError(getErrorMessage(err));
      } finally {
        if (!signal?.aborted && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [id, token],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData({ signal: controller.signal });
    return () => controller.abort();
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
