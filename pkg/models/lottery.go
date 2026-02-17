package models

import "time"

type Lottery struct {
	ID                string     `json:"id"`
	Title             string     `json:"title"`
	Description       string     `json:"description"`
	CreatorID         int64      `json:"creator_id"`
	DrawMode          string     `json:"draw_mode"`
	DrawTime          *time.Time `json:"draw_time"`
	MaxEntries        *int       `json:"max_entries"`
	Status            string     `json:"status"`
	CreatedAt         time.Time  `json:"created_at"`
	IsWeightsDisabled bool       `json:"is_weights_disabled"`
}

type Prize struct {
	ID        int64  `json:"id"`
	LotteryID string `json:"lottery_id"`
	Name      string `json:"name"`
	Quantity  int    `json:"quantity"`
}

type Participant struct {
	ID           int64         `json:"id"`
	LotteryID    string        `json:"lottery_id"`
	UserID       int64         `json:"user_id"`
	Username     string        `json:"username"`
	FirstName    string        `json:"first_name"`
	LastName     string        `json:"last_name"`
	Weight       int           `json:"weight"`
	PrizeWeights map[int64]int `json:"prize_weights,omitempty"` // PrizeID -> Weight
	JoinedAt     time.Time     `json:"joined_at"`
}

type PrizeWeight struct {
	LotteryID string `json:"lottery_id"`
	UserID    int64  `json:"user_id"`
	PrizeID   int64  `json:"prize_id"`
	Weight    int    `json:"weight"`
}

type EditToken struct {
	Token     string    `json:"token"`
	LotteryID string    `json:"lottery_id"`
	ExpiresAt time.Time `json:"expires_at"`
}

type Winner struct {
	ID            int64  `json:"id"`
	LotteryID     string `json:"lottery_id"`
	ParticipantID int64  `json:"participant_id"`
	PrizeID       int64  `json:"prize_id"`
	UserID        int64  `json:"user_id"`
	Username      string `json:"username"`
	PrizeName     string `json:"prize_name"`
}
