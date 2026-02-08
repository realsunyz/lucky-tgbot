// API base URL - in production this will be the same origin
const API_BASE = import.meta.env.VITE_API_BASE || "";

export interface Lottery {
  id: string;
  title: string;
  description: string;
  creator_id: number;
  draw_mode: "timed" | "full" | "manual";
  draw_time?: string;
  max_entries?: number;
  status: "draft" | "active" | "completed";
  created_at: string;
}

export interface Prize {
  id?: number;
  lottery_id?: string;
  name: string;
  quantity: number;
}

export interface Participant {
  id: number;
  lottery_id: string;
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  weight: number;
  prize_weights?: Record<number, number>;
  joined_at: string;
}

// ... existing code ...

// Update prize specific weight (requires token)
export async function updatePrizeWeight(
  id: string,
  userId: number,
  prizeId: number,
  weight: number,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/lottery/${id}/participants/${userId}/prize_weight?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prize_id: prizeId, weight }),
    },
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update prize weight");
  }
}

export interface Winner {
  id: number;
  lottery_id: string;
  participant_id: number;
  prize_id: number;
  user_id: number;
  username: string;
  prize_name: string;
}

export interface LotteryResponse {
  id: string;
  title: string;
  description: string;
  creator_id: number;
  draw_mode: "timed" | "full" | "manual";
  draw_time?: string;
  max_entries?: number;
  status: "draft" | "active" | "completed";
  created_at: string;
  prizes: Prize[];
  participants?: Participant[];
  participant_count?: number;
  winners?: Winner[];
}

export interface CreateLotteryRequest {
  title: string;
  description: string;
  draw_mode: "timed" | "full" | "manual";
  draw_time?: string;
  max_entries?: number;
  prizes: Prize[];
  creator_id: number;
}

// Get lottery details
export async function getLottery(id: string): Promise<LotteryResponse> {
  const res = await fetch(`${API_BASE}/api/lottery/${id}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch lottery");
  }
  return res.json();
}

// Create or update lottery (from creation page)
export async function createLottery(
  id: string,
  data: CreateLotteryRequest,
): Promise<LotteryResponse> {
  const res = await fetch(`${API_BASE}/api/lottery/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create lottery");
  }
  return res.json();
}

// Update lottery (requires token)
export async function updateLottery(
  id: string,
  token: string,
  data: Partial<CreateLotteryRequest>,
): Promise<LotteryResponse> {
  const res = await fetch(`${API_BASE}/api/lottery/${id}?token=${token}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update lottery");
  }
  return res.json();
}

// Join lottery
export async function joinLottery(
  id: string,
  userData: {
    user_id: number;
    username: string;
    first_name: string;
    last_name: string;
  },
): Promise<Participant> {
  const res = await fetch(`${API_BASE}/api/lottery/${id}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to join lottery");
  }
  return res.json();
}

// Get participants (requires token)
export async function getParticipants(
  id: string,
  token: string,
): Promise<Participant[]> {
  const res = await fetch(
    `${API_BASE}/api/lottery/${id}/participants?token=${token}`,
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch participants");
  }
  return res.json();
}

// Update participant weight (requires token)
export async function updateParticipantWeight(
  id: string,
  userId: number,
  weight: number,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/lottery/${id}/participants/${userId}?token=${token}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight }),
    },
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update weight");
  }
}

// Remove participant (requires token)
export async function removeParticipant(
  id: string,
  userId: number,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/lottery/${id}/participants/${userId}?token=${token}`,
    {
      method: "DELETE",
    },
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to remove participant");
  }
}

// Draw lottery (requires token)
export async function drawLottery(
  id: string,
  token: string,
): Promise<{ success: boolean; winners: Winner[] }> {
  const res = await fetch(`${API_BASE}/api/lottery/${id}/draw?token=${token}`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to draw lottery");
  }
  return res.json();
}

// Get results
export async function getResults(
  id: string,
): Promise<{ lottery: Lottery; prizes: Prize[]; winners: Winner[] }> {
  const res = await fetch(`${API_BASE}/api/lottery/${id}/results`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch results");
  }
  return res.json();
}
