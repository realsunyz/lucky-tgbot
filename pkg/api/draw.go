package api

import (
	"math/rand"
	"time"

	"github.com/realSunyz/lucky-tgbot/pkg/database"
	"github.com/realSunyz/lucky-tgbot/pkg/models"
)

func performDraw(lotteryID string) ([]models.Winner, error) {
	lottery, err := database.GetLottery(lotteryID)
	if err != nil {
		return nil, err
	}

	prizes, err := database.GetPrizes(lotteryID)
	if err != nil {
		return nil, err
	}

	participants, err := database.GetParticipants(lotteryID)
	if err != nil {
		return nil, err
	}

	if len(participants) == 0 {
		lottery.Status = "completed"
		database.UpdateLottery(lottery)
		return nil, nil
	}

	wonPrizes := make(map[int64]map[int64]bool)
	var winners []models.Winner
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	for _, prize := range prizes {
		// Build weighted pool for this specific prize
		var weightedPool []models.Participant
		for _, p := range participants {
			weight := p.Weight // Default to global weight
			if w, ok := p.PrizeWeights[prize.ID]; ok {
				weight = w
			}
			for i := 0; i < weight; i++ {
				weightedPool = append(weightedPool, p)
			}
		}

		// Shuffle the prize-specific pool
		rng.Shuffle(len(weightedPool), func(i, j int) {
			weightedPool[i], weightedPool[j] = weightedPool[j], weightedPool[i]
		})

		poolIndex := 0
		for q := 0; q < prize.Quantity; q++ {
			if len(weightedPool) == 0 {
				break
			}

			// Find a winner for this unit of the prize
			// We need to loop because the selected candidate might have already won this prize type
			// (though they *can* win different prizes)
			// Or we might enforce "one prize per user" globally if desired, but currently logic
			// allows multiple prizes per user, but duplicates of SAME prize ID are prevented below.

			// Note: The pool contains multiple entries per user.
			// If we pick a user who has already won *this* prize, we skip and pick next.
			// If we run out of pool, we reshuffle (if needed) or stop if everyone valid has won.

			attempts := 0
			// Simple protection against infinite loops if everyone in remaining pool already won this prize
			maxAttempts := len(weightedPool) * 2

			for attempts < maxAttempts {
				if poolIndex >= len(weightedPool) {
					poolIndex = 0
					rng.Shuffle(len(weightedPool), func(i, j int) {
						weightedPool[i], weightedPool[j] = weightedPool[j], weightedPool[i]
					})
				}

				candidate := weightedPool[poolIndex]
				poolIndex++
				attempts++

				if wonPrizes[candidate.UserID] == nil {
					wonPrizes[candidate.UserID] = make(map[int64]bool)
				}
				if wonPrizes[candidate.UserID][prize.ID] {
					continue
				}

				wonPrizes[candidate.UserID][prize.ID] = true

				winner := models.Winner{
					LotteryID:     lotteryID,
					ParticipantID: candidate.ID,
					PrizeID:       prize.ID,
					UserID:        candidate.UserID,
					Username:      candidate.Username,
					PrizeName:     prize.Name,
				}

				if err := database.CreateWinner(&winner); err != nil {
					continue
				}
				winners = append(winners, winner)
				break
			}
		}
	}

	lottery.Status = "completed"
	if err := database.UpdateLottery(lottery); err != nil {
		return winners, err
	}

	if NotifyWinners != nil {
		go NotifyWinners(lotteryID, winners)
	}

	return winners, nil
}

func CheckTimedLotteries() {
	db := database.GetDB()
	now := time.Now()

	rows, err := db.Query(`
		SELECT id FROM lotteries 
		WHERE status = 'active' AND draw_mode = 'timed' AND draw_time <= ?
	`, now)
	if err != nil {
		return
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			continue
		}
		ids = append(ids, id)
	}

	for _, id := range ids {
		performDraw(id)
	}
}

func StartTimedDrawChecker() {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			CheckTimedLotteries()
		}
	}()
}
