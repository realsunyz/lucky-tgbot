package database

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/realSunyz/lucky-tgbot/pkg/models"
)

func CreateLottery(lottery *models.Lottery) error {
	db := GetDB()
	now := time.Now().UTC()
	lottery.CreatedAt = now
	if lottery.Status == "" {
		lottery.Status = "draft"
	}

	_, err := db.Exec(`
		INSERT INTO lotteries (id, title, description, creator_id, draw_mode, draw_time, max_entries, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, lottery.ID, lottery.Title, lottery.Description, lottery.CreatorID, lottery.DrawMode, lottery.DrawTime, lottery.MaxEntries, lottery.Status, lottery.CreatedAt)
	return err
}

func GetLottery(id string) (*models.Lottery, error) {
	db := GetDB()
	lottery := &models.Lottery{}
	err := db.QueryRow(`
		SELECT id, title, description, creator_id, draw_mode, draw_time, max_entries, status, created_at
		FROM lotteries WHERE id = ?
	`, id).Scan(&lottery.ID, &lottery.Title, &lottery.Description, &lottery.CreatorID, &lottery.DrawMode, &lottery.DrawTime, &lottery.MaxEntries, &lottery.Status, &lottery.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return lottery, err
}

func UpdateLottery(lottery *models.Lottery) error {
	db := GetDB()
	_, err := db.Exec(`
		UPDATE lotteries SET title = ?, description = ?, draw_mode = ?, draw_time = ?, max_entries = ?, status = ?
		WHERE id = ?
	`, lottery.Title, lottery.Description, lottery.DrawMode, lottery.DrawTime, lottery.MaxEntries, lottery.Status, lottery.ID)
	return err
}

func CreatePrize(prize *models.Prize) error {
	db := GetDB()
	result, err := db.Exec(`
		INSERT INTO prizes (lottery_id, name, quantity)
		VALUES (?, ?, ?)
	`, prize.LotteryID, prize.Name, prize.Quantity)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	prize.ID = id
	return nil
}

func GetPrizes(lotteryID string) ([]models.Prize, error) {
	db := GetDB()
	rows, err := db.Query(`
		SELECT id, lottery_id, name, quantity FROM prizes WHERE lottery_id = ?
	`, lotteryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var prizes []models.Prize
	for rows.Next() {
		var p models.Prize
		if err := rows.Scan(&p.ID, &p.LotteryID, &p.Name, &p.Quantity); err != nil {
			return nil, err
		}
		prizes = append(prizes, p)
	}
	return prizes, nil
}

func DeletePrizes(lotteryID string) error {
	db := GetDB()
	_, err := db.Exec(`DELETE FROM prizes WHERE lottery_id = ?`, lotteryID)
	return err
}

func AddParticipant(p *models.Participant) error {
	db := GetDB()
	now := time.Now().UTC()
	p.JoinedAt = now
	if p.Weight == 0 {
		p.Weight = 1
	}

	result, err := db.Exec(`
		INSERT INTO participants (lottery_id, user_id, username, first_name, last_name, weight, joined_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(lottery_id, user_id) DO NOTHING
	`, p.LotteryID, p.UserID, p.Username, p.FirstName, p.LastName, p.Weight, p.JoinedAt)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	p.ID = id
	return nil
}

func GetParticipants(lotteryID string) ([]models.Participant, error) {
	db := GetDB()
	rows, err := db.Query(`
		SELECT id, lottery_id, user_id, username, first_name, last_name, weight, joined_at
		FROM participants WHERE lottery_id = ? ORDER BY joined_at
	`, lotteryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var participants []models.Participant
	participantMap := make(map[int64]*models.Participant)

	for rows.Next() {
		var p models.Participant
		if err := rows.Scan(&p.ID, &p.LotteryID, &p.UserID, &p.Username, &p.FirstName, &p.LastName, &p.Weight, &p.JoinedAt); err != nil {
			return nil, err
		}
		p.PrizeWeights = make(map[int64]int)
		participants = append(participants, p)
		participantMap[p.UserID] = &participants[len(participants)-1]
	}

	// Fetch prize weights
	prizeWeights, err := GetPrizeWeights(lotteryID)
	if err == nil {
		for _, pw := range prizeWeights {
			if p, ok := participantMap[pw.UserID]; ok {
				p.PrizeWeights[pw.PrizeID] = pw.Weight
			}
		}
	}

	return participants, nil
}

func GetParticipantCount(lotteryID string) (int, error) {
	db := GetDB()
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM participants WHERE lottery_id = ?`, lotteryID).Scan(&count)
	return count, err
}

func UpdateParticipantWeight(lotteryID string, userID int64, weight int) error {
	db := GetDB()
	_, err := db.Exec(`
		UPDATE participants SET weight = ? WHERE lottery_id = ? AND user_id = ?
	`, weight, lotteryID, userID)
	return err
}

func UpdateParticipantWeightBatch(lotteryID string, weight int) error {
	db := GetDB()
	_, err := db.Exec(`
		UPDATE participants SET weight = ? WHERE lottery_id = ?
	`, weight, lotteryID)
	return err
}

func SetPrizeWeight(lotteryID string, userID int64, prizeID int64, weight int) error {
	db := GetDB()
	_, err := db.Exec(`
		INSERT INTO prize_weights (lottery_id, user_id, prize_id, weight)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(lottery_id, user_id, prize_id) DO UPDATE SET weight = excluded.weight
	`, lotteryID, userID, prizeID, weight)
	return err
}

func DeletePrizeWeight(lotteryID string, userID int64, prizeID int64) error {
	db := GetDB()
	_, err := db.Exec(`DELETE FROM prize_weights WHERE lottery_id = ? AND user_id = ? AND prize_id = ?`, lotteryID, userID, prizeID)
	return err
}

func GetPrizeWeights(lotteryID string) ([]models.PrizeWeight, error) {
	db := GetDB()
	rows, err := db.Query(`
		SELECT lottery_id, user_id, prize_id, weight
		FROM prize_weights WHERE lottery_id = ?
	`, lotteryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var weights []models.PrizeWeight
	for rows.Next() {
		var pw models.PrizeWeight
		if err := rows.Scan(&pw.LotteryID, &pw.UserID, &pw.PrizeID, &pw.Weight); err != nil {
			return nil, err
		}
		weights = append(weights, pw)
	}
	return weights, nil
}

func RemoveParticipant(lotteryID string, userID int64) error {
	db := GetDB()
	_, err := db.Exec(`DELETE FROM participants WHERE lottery_id = ? AND user_id = ?`, lotteryID, userID)
	return err
}

func CreateEditToken(token *models.EditToken) error {
	db := GetDB()
	db.Exec(`DELETE FROM edit_tokens WHERE lottery_id = ?`, token.LotteryID)

	_, err := db.Exec(`
		INSERT INTO edit_tokens (token, lottery_id, expires_at)
		VALUES (?, ?, ?)
	`, token.Token, token.LotteryID, token.ExpiresAt)
	return err
}

func ValidateEditToken(lotteryID, token string) (bool, error) {
	db := GetDB()
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM edit_tokens 
		WHERE lottery_id = ? AND token = ? AND expires_at > ?
	`, lotteryID, token, time.Now().UTC()).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func DeleteEditToken(token string) error {
	db := GetDB()
	_, err := db.Exec(`DELETE FROM edit_tokens WHERE token = ?`, token)
	return err
}

func CreateWinner(w *models.Winner) error {
	db := GetDB()
	result, err := db.Exec(`
		INSERT INTO winners (lottery_id, participant_id, prize_id, user_id, username, prize_name)
		VALUES (?, ?, ?, ?, ?, ?)
	`, w.LotteryID, w.ParticipantID, w.PrizeID, w.UserID, w.Username, w.PrizeName)
	if err != nil {
		return err
	}
	id, _ := result.LastInsertId()
	w.ID = id
	return nil
}

func GetWinners(lotteryID string) ([]models.Winner, error) {
	db := GetDB()
	rows, err := db.Query(`
		SELECT id, lottery_id, participant_id, prize_id, user_id, username, prize_name
		FROM winners WHERE lottery_id = ?
	`, lotteryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var winners []models.Winner
	for rows.Next() {
		var w models.Winner
		if err := rows.Scan(&w.ID, &w.LotteryID, &w.ParticipantID, &w.PrizeID, &w.UserID, &w.Username, &w.PrizeName); err != nil {
			return nil, err
		}
		winners = append(winners, w)
	}
	return winners, nil
}

func GenerateLotteryID() (string, error) {
	db := GetDB()
	for i := 0; i < 10; i++ {
		id := fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)
		var exists int
		err := db.QueryRow(`SELECT COUNT(*) FROM lotteries WHERE id = ?`, id).Scan(&exists)
		if err != nil {
			return "", err
		}
		if exists == 0 {
			return id, nil
		}
	}
	return "", fmt.Errorf("failed to generate unique lottery ID")
}
