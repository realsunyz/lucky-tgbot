package database

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/realSunyz/lucky-tgbot/pkg/models"
)

var ErrParticipantExists = errors.New("participant already exists")

func CreateLottery(lottery *models.Lottery) error {
	db := GetDB()
	now := time.Now().UTC()
	lottery.CreatedAt = now
	if lottery.Status == "" {
		lottery.Status = "draft"
	}

	_, err := db.Exec(`
		INSERT INTO lotteries (id, title, description, creator_id, participants, draw_mode, draw_time, max_entries, status, created_at, is_weights_disabled)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, lottery.ID, lottery.Title, lottery.Description, lottery.CreatorID, lottery.Participants, lottery.DrawMode, lottery.DrawTime, lottery.MaxEntries, lottery.Status, lottery.CreatedAt, lottery.IsWeightsDisabled)
	return err
}

func CountUserLotteriesCreatedSince(creatorID int64, since time.Time) (int, error) {
	db := GetDB()
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM lotteries
		WHERE creator_id = ? AND created_at >= ?
	`, creatorID, since).Scan(&count)
	return count, err
}

func GetLottery(id string) (*models.Lottery, error) {
	db := GetDB()
	lottery := &models.Lottery{}
	err := db.QueryRow(`
		SELECT id, title, description, creator_id, participants, draw_mode, draw_time, max_entries, status, created_at, is_weights_disabled
		FROM lotteries WHERE id = ?
	`, id).Scan(&lottery.ID, &lottery.Title, &lottery.Description, &lottery.CreatorID, &lottery.Participants, &lottery.DrawMode, &lottery.DrawTime, &lottery.MaxEntries, &lottery.Status, &lottery.CreatedAt, &lottery.IsWeightsDisabled)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return lottery, err
}

func UpdateLottery(lottery *models.Lottery) error {
	db := GetDB()
	_, err := db.Exec(`
		UPDATE lotteries SET title = ?, description = ?, participants = ?, draw_mode = ?, draw_time = ?, max_entries = ?, status = ?, is_weights_disabled = ?
		WHERE id = ?
	`, lottery.Title, lottery.Description, lottery.Participants, lottery.DrawMode, lottery.DrawTime, lottery.MaxEntries, lottery.Status, lottery.IsWeightsDisabled, lottery.ID)
	return err
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

func AddParticipant(p *models.Participant) error {
	db := GetDB()
	now := time.Now().UTC()
	p.JoinedAt = now
	if p.Weight == 0 {
		p.Weight = 1
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	result, err := tx.Exec(`
		INSERT INTO participants (lottery_id, user_id, username, first_name, last_name, weight, joined_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(lottery_id, user_id) DO NOTHING
	`, p.LotteryID, p.UserID, p.Username, p.FirstName, p.LastName, p.Weight, p.JoinedAt)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrParticipantExists
	}

	if _, err = tx.Exec(`UPDATE lotteries SET participants = participants + 1 WHERE id = ?`, p.LotteryID); err != nil {
		return err
	}

	id, _ := result.LastInsertId()
	p.ID = id

	if err = tx.Commit(); err != nil {
		return err
	}
	committed = true

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

func UpdateParticipantWeight(lotteryID string, userID int64, weight int) error {
	db := GetDB()
	_, err := db.Exec(`
		UPDATE participants SET weight = ? WHERE lottery_id = ? AND user_id = ?
	`, weight, lotteryID, userID)
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
	tx, err := db.Begin()
	if err != nil {
		return err
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	result, err := tx.Exec(`DELETE FROM participants WHERE lottery_id = ? AND user_id = ?`, lotteryID, userID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows > 0 {
		if _, err = tx.Exec(`UPDATE lotteries SET participants = MAX(participants - 1, 0) WHERE id = ?`, lotteryID); err != nil {
			return err
		}
		if _, err = tx.Exec(`DELETE FROM prize_weights WHERE lottery_id = ? AND user_id = ?`, lotteryID, userID); err != nil {
			return err
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}
	committed = true
	return nil
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

func DeleteLottery(id string) error {
	db := GetDB()
	_, err := db.Exec(`DELETE FROM lotteries WHERE id = ?`, id)
	return err
}
