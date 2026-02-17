package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/realSunyz/lucky-tgbot/pkg/database"
	"github.com/realSunyz/lucky-tgbot/pkg/logger"
	"github.com/realSunyz/lucky-tgbot/pkg/models"
)

var (
	ErrLotteryNotFound   = errors.New("lottery not found")
	ErrLotteryConflict   = errors.New("lottery already exists")
	ErrLotteryEnded      = errors.New("lottery already completed")
	ErrLotteryNotActive  = errors.New("lottery is not active")
	ErrLotteryFull       = errors.New("lottery is full")
	ErrLotteryNotDrawn   = errors.New("lottery not yet drawn")
	ErrTokenInvalid      = errors.New("invalid or expired token")
	ErrPermissionDenied  = errors.New("permission denied")
	ErrParticipantExists = errors.New("participant already exists")
)

type Notifier interface {
	LotteryCreated(lottery *models.Lottery, prizes []models.Prize)
	WinnersDrawn(lottery *models.Lottery, winners []models.Winner)
}

type LotterySnapshot struct {
	Lottery          *models.Lottery
	Prizes           []models.Prize
	ParticipantCount int
	Winners          []models.Winner
}

type CreateLotteryInput struct {
	Title             string
	Description       string
	DrawMode          string
	DrawTime          *time.Time
	MaxEntries        *int
	Prizes            []models.Prize
	CreatorID         int64
	IsWeightsDisabled bool
}

type UpdateLotteryInput struct {
	Title             string
	Description       string
	DrawMode          string
	DrawTime          *time.Time
	MaxEntries        *int
	Prizes            []models.Prize
	ReplacePrizes     bool
	IsWeightsDisabled bool
}

type JoinInput struct {
	UserID    int64
	Username  string
	FirstName string
	LastName  string
}

type LotteryService struct {
	db       *sql.DB
	notifier Notifier
}

func NewLotteryService(db *sql.DB, notifier Notifier) *LotteryService {
	return &LotteryService{db: db, notifier: notifier}
}

func (s *LotteryService) CreateDraftLottery(creatorID int64) (*models.Lottery, error) {
	id, err := database.GenerateLotteryID()
	if err != nil {
		return nil, err
	}

	lottery := &models.Lottery{
		ID:        id,
		CreatorID: creatorID,
		Status:    "draft",
		DrawMode:  "manual",
	}
	if err := database.CreateLottery(lottery); err != nil {
		return nil, err
	}
	return lottery, nil
}

func (s *LotteryService) GetLotterySnapshot(id string) (*LotterySnapshot, error) {
	lottery, err := database.GetLottery(id)
	if err != nil {
		return nil, err
	}
	if lottery == nil {
		return nil, ErrLotteryNotFound
	}

	prizes, err := database.GetPrizes(id)
	if err != nil {
		return nil, err
	}

	count, err := database.GetParticipantCount(id)
	if err != nil {
		return nil, err
	}

	snapshot := &LotterySnapshot{
		Lottery:          lottery,
		Prizes:           prizes,
		ParticipantCount: count,
	}

	if lottery.Status == "completed" {
		winners, err := database.GetWinners(id)
		if err != nil {
			return nil, err
		}
		snapshot.Winners = winners
	}

	return snapshot, nil
}

func (s *LotteryService) GetResults(id string) (*models.Lottery, []models.Prize, []models.Winner, error) {
	lottery, err := database.GetLottery(id)
	if err != nil {
		return nil, nil, nil, err
	}
	if lottery == nil {
		return nil, nil, nil, ErrLotteryNotFound
	}
	if lottery.Status != "completed" {
		return nil, nil, nil, ErrLotteryNotDrawn
	}

	winners, err := database.GetWinners(id)
	if err != nil {
		return nil, nil, nil, err
	}
	prizes, err := database.GetPrizes(id)
	if err != nil {
		return nil, nil, nil, err
	}
	return lottery, prizes, winners, nil
}

func (s *LotteryService) CreateLottery(id string, input CreateLotteryInput) (*models.Lottery, []models.Prize, error) {
	existing, err := database.GetLottery(id)
	if err != nil {
		return nil, nil, err
	}
	if existing != nil && existing.Status != "draft" {
		return nil, nil, ErrLotteryConflict
	}

	lottery := &models.Lottery{
		ID:                id,
		Title:             input.Title,
		Description:       input.Description,
		CreatorID:         input.CreatorID,
		DrawMode:          input.DrawMode,
		DrawTime:          input.DrawTime,
		MaxEntries:        input.MaxEntries,
		Status:            "active",
		IsWeightsDisabled: input.IsWeightsDisabled,
	}

	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		return nil, nil, err
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	if existing != nil {
		lottery.CreatorID = existing.CreatorID
		lottery.CreatedAt = existing.CreatedAt
		if err := updateLotteryTx(tx, lottery); err != nil {
			return nil, nil, err
		}
	} else {
		now := time.Now().UTC()
		lottery.CreatedAt = now
		if err := createLotteryTx(tx, lottery); err != nil {
			return nil, nil, err
		}
	}

	if err := deletePrizesTx(tx, id); err != nil {
		return nil, nil, err
	}
	if err := createPrizesTx(tx, id, input.Prizes); err != nil {
		return nil, nil, err
	}

	prizes, err := getPrizesTx(tx, id)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}
	committed = true

	if s.notifier != nil {
		go s.notifier.LotteryCreated(lottery, prizes)
	}

	return lottery, prizes, nil
}

func (s *LotteryService) UpdateLottery(id string, input UpdateLotteryInput) (*models.Lottery, []models.Prize, error) {
	lottery, err := database.GetLottery(id)
	if err != nil {
		return nil, nil, err
	}
	if lottery == nil {
		return nil, nil, ErrLotteryNotFound
	}
	if lottery.Status == "completed" {
		return nil, nil, ErrLotteryEnded
	}

	if input.Title != "" {
		lottery.Title = input.Title
	}
	if input.Description != "" {
		lottery.Description = input.Description
	}
	if input.DrawMode != "" {
		lottery.DrawMode = input.DrawMode
	}
	if input.DrawTime != nil {
		lottery.DrawTime = input.DrawTime
	}
	if input.MaxEntries != nil {
		lottery.MaxEntries = input.MaxEntries
	}
	lottery.IsWeightsDisabled = input.IsWeightsDisabled

	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		return nil, nil, err
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	if err := updateLotteryTx(tx, lottery); err != nil {
		return nil, nil, err
	}

	if input.ReplacePrizes {
		if err := deletePrizesTx(tx, id); err != nil {
			return nil, nil, err
		}
		if err := createPrizesTx(tx, id, input.Prizes); err != nil {
			return nil, nil, err
		}
	}

	prizes, err := getPrizesTx(tx, id)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}
	committed = true

	return lottery, prizes, nil
}

func (s *LotteryService) JoinLottery(lotteryID string, input JoinInput) (*models.Lottery, *models.Participant, error) {
	lottery, err := database.GetLottery(lotteryID)
	if err != nil {
		return nil, nil, err
	}
	if lottery == nil {
		return nil, nil, ErrLotteryNotFound
	}
	if lottery.Status != "active" {
		return lottery, nil, ErrLotteryNotActive
	}

	if lottery.MaxEntries != nil {
		count, err := database.GetParticipantCount(lotteryID)
		if err != nil {
			return nil, nil, err
		}
		if count >= *lottery.MaxEntries {
			return lottery, nil, ErrLotteryFull
		}
	}

	participant := &models.Participant{
		LotteryID: lotteryID,
		UserID:    input.UserID,
		Username:  input.Username,
		FirstName: input.FirstName,
		LastName:  input.LastName,
		Weight:    1,
	}

	if err := database.AddParticipant(participant); err != nil {
		if errors.Is(err, database.ErrParticipantExists) {
			return lottery, nil, ErrParticipantExists
		}
		return nil, nil, err
	}

	if lottery.DrawMode == "full" && lottery.MaxEntries != nil {
		count, err := database.GetParticipantCount(lotteryID)
		if err == nil && count >= *lottery.MaxEntries {
			go s.drawWithRetry(lotteryID, "full")
		}
	}

	return lottery, participant, nil
}

func (s *LotteryService) GetParticipants(lotteryID string) ([]models.Participant, error) {
	return database.GetParticipants(lotteryID)
}

func (s *LotteryService) UpdateParticipantWeight(lotteryID string, userID int64, weight int) error {
	return database.UpdateParticipantWeight(lotteryID, userID, weight)
}

func (s *LotteryService) SetPrizeWeight(lotteryID string, userID int64, prizeID int64, weight int) error {
	return database.SetPrizeWeight(lotteryID, userID, prizeID, weight)
}

func (s *LotteryService) DeletePrizeWeight(lotteryID string, userID int64, prizeID int64) error {
	return database.DeletePrizeWeight(lotteryID, userID, prizeID)
}

func (s *LotteryService) RemoveParticipant(lotteryID string, userID int64) error {
	return database.RemoveParticipant(lotteryID, userID)
}

func (s *LotteryService) ValidateEditToken(lotteryID, token string) error {
	valid, err := database.ValidateEditToken(lotteryID, token)
	if err != nil {
		return err
	}
	if !valid {
		return ErrTokenInvalid
	}
	return nil
}

func (s *LotteryService) CreateEditToken(lotteryID string, requesterID int64, ttl time.Duration) (string, *models.Lottery, error) {
	lottery, err := database.GetLottery(lotteryID)
	if err != nil {
		return "", nil, err
	}
	if lottery == nil {
		return "", nil, ErrLotteryNotFound
	}
	if lottery.CreatorID != requesterID {
		return "", nil, ErrPermissionDenied
	}

	token := uuid.NewString()
	editToken := &models.EditToken{
		Token:     token,
		LotteryID: lotteryID,
		ExpiresAt: time.Now().Add(ttl),
	}
	if err := database.CreateEditToken(editToken); err != nil {
		return "", nil, err
	}

	return token, lottery, nil
}

func (s *LotteryService) DrawLottery(lotteryID string) ([]models.Winner, error) {
	tx, err := s.db.BeginTx(context.Background(), nil)
	if err != nil {
		return nil, err
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	lottery, err := getLotteryTx(tx, lotteryID)
	if err != nil {
		return nil, err
	}
	if lottery == nil {
		return nil, ErrLotteryNotFound
	}
	if lottery.Status == "completed" {
		return nil, ErrLotteryEnded
	}
	if lottery.Status != "active" {
		return nil, ErrLotteryNotActive
	}

	prizes, err := getPrizesTx(tx, lotteryID)
	if err != nil {
		return nil, err
	}

	participants, err := getParticipantsTx(tx, lotteryID)
	if err != nil {
		return nil, err
	}

	winners := drawWinners(lotteryID, prizes, participants)
	winnerStmt, err := tx.Prepare(`
		INSERT INTO winners (lottery_id, participant_id, prize_id, user_id, username, prize_name)
		VALUES (?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return nil, err
	}
	defer winnerStmt.Close()

	for i := range winners {
		if err := createWinnerStmt(winnerStmt, &winners[i]); err != nil {
			return nil, err
		}
	}

	lottery.Status = "completed"
	if err := updateLotteryTx(tx, lottery); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	committed = true

	if s.notifier != nil && len(winners) > 0 {
		go s.notifier.WinnersDrawn(lottery, winners)
	}

	return winners, nil
}

func (s *LotteryService) CheckAutoDrawLotteries() error {
	now := time.Now().UTC()
	rows, err := s.db.Query(`
		SELECT l.id
		FROM lotteries l
		WHERE l.status = 'active' AND (
			(l.draw_mode = 'timed' AND l.draw_time IS NOT NULL AND l.draw_time <= ?)
			OR
			(
				l.draw_mode = 'full'
				AND l.max_entries IS NOT NULL
				AND (SELECT COUNT(*) FROM participants p WHERE p.lottery_id = l.id) >= l.max_entries
			)
		)
	`, now)
	if err != nil {
		return err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if scanErr := rows.Scan(&id); scanErr != nil {
			continue
		}
		ids = append(ids, id)
	}

	for _, id := range ids {
		s.drawWithRetry(id, "scheduler")
	}

	return nil
}

func (s *LotteryService) drawWithRetry(lotteryID string, source string) {
	const maxAttempts = 3
	backoff := 200 * time.Millisecond

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		_, err := s.DrawLottery(lotteryID)
		if err == nil ||
			errors.Is(err, ErrLotteryEnded) ||
			errors.Is(err, ErrLotteryNotActive) ||
			errors.Is(err, ErrLotteryNotFound) {
			return
		}

		if attempt == maxAttempts {
			logger.Errorf("%s auto draw failed for %s after %d attempts: %v", source, lotteryID, maxAttempts, err)
			return
		}

		time.Sleep(backoff)
		backoff *= 2
	}
}

func drawWinners(lotteryID string, prizes []models.Prize, participants []models.Participant) []models.Winner {
	if len(participants) == 0 {
		return nil
	}

	wonPrizes := make(map[int64]map[int64]bool)
	var winners []models.Winner
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	for _, prize := range prizes {
		var weightedPool []models.Participant
		for _, p := range participants {
			weight := p.Weight
			if w, ok := p.PrizeWeights[prize.ID]; ok {
				weight = w
			}
			for i := 0; i < weight; i++ {
				weightedPool = append(weightedPool, p)
			}
		}

		if len(weightedPool) == 0 {
			continue
		}

		rng.Shuffle(len(weightedPool), func(i, j int) {
			weightedPool[i], weightedPool[j] = weightedPool[j], weightedPool[i]
		})

		poolIndex := 0
		for q := 0; q < prize.Quantity; q++ {
			attempts := 0
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

				winners = append(winners, models.Winner{
					LotteryID:     lotteryID,
					ParticipantID: candidate.ID,
					PrizeID:       prize.ID,
					UserID:        candidate.UserID,
					Username:      candidate.Username,
					PrizeName:     prize.Name,
				})
				break
			}
		}
	}

	return winners
}

func createLotteryTx(tx *sql.Tx, lottery *models.Lottery) error {
	_, err := tx.Exec(`
		INSERT INTO lotteries (id, title, description, creator_id, draw_mode, draw_time, max_entries, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, lottery.ID, lottery.Title, lottery.Description, lottery.CreatorID, lottery.DrawMode, lottery.DrawTime, lottery.MaxEntries, lottery.Status, lottery.CreatedAt)
	return err
}

func getLotteryTx(tx *sql.Tx, id string) (*models.Lottery, error) {
	lottery := &models.Lottery{}
	err := tx.QueryRow(`
		SELECT id, title, description, creator_id, draw_mode, draw_time, max_entries, status, created_at, is_weights_disabled
		FROM lotteries WHERE id = ?
	`, id).Scan(
		&lottery.ID,
		&lottery.Title,
		&lottery.Description,
		&lottery.CreatorID,
		&lottery.DrawMode,
		&lottery.DrawTime,
		&lottery.MaxEntries,
		&lottery.Status,
		&lottery.CreatedAt,
		&lottery.IsWeightsDisabled,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return lottery, nil
}

func updateLotteryTx(tx *sql.Tx, lottery *models.Lottery) error {
	_, err := tx.Exec(`
		UPDATE lotteries
		SET title = ?, description = ?, draw_mode = ?, draw_time = ?, max_entries = ?, status = ?, is_weights_disabled = ?
		WHERE id = ?
	`, lottery.Title, lottery.Description, lottery.DrawMode, lottery.DrawTime, lottery.MaxEntries, lottery.Status, lottery.IsWeightsDisabled, lottery.ID)
	return err
}

func deletePrizesTx(tx *sql.Tx, lotteryID string) error {
	_, err := tx.Exec(`DELETE FROM prizes WHERE lottery_id = ?`, lotteryID)
	return err
}

func createPrizesTx(tx *sql.Tx, lotteryID string, prizes []models.Prize) error {
	stmt, err := tx.Prepare(`
		INSERT INTO prizes (lottery_id, name, quantity)
		VALUES (?, ?, ?)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for i := range prizes {
		_, err := stmt.Exec(lotteryID, prizes[i].Name, prizes[i].Quantity)
		if err != nil {
			return err
		}
	}
	return nil
}

func getPrizesTx(tx *sql.Tx, lotteryID string) ([]models.Prize, error) {
	rows, err := tx.Query(`
		SELECT id, lottery_id, name, quantity
		FROM prizes WHERE lottery_id = ?
	`, lotteryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var prizes []models.Prize
	for rows.Next() {
		var p models.Prize
		if scanErr := rows.Scan(&p.ID, &p.LotteryID, &p.Name, &p.Quantity); scanErr != nil {
			return nil, scanErr
		}
		prizes = append(prizes, p)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return prizes, nil
}

func getParticipantsTx(tx *sql.Tx, lotteryID string) ([]models.Participant, error) {
	rows, err := tx.Query(`
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
		if scanErr := rows.Scan(&p.ID, &p.LotteryID, &p.UserID, &p.Username, &p.FirstName, &p.LastName, &p.Weight, &p.JoinedAt); scanErr != nil {
			return nil, scanErr
		}
		p.PrizeWeights = make(map[int64]int)
		participants = append(participants, p)
		participantMap[p.UserID] = &participants[len(participants)-1]
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	prizeWeightRows, err := tx.Query(`
		SELECT user_id, prize_id, weight
		FROM prize_weights WHERE lottery_id = ?
	`, lotteryID)
	if err != nil {
		return nil, err
	}
	defer prizeWeightRows.Close()

	for prizeWeightRows.Next() {
		var userID int64
		var prizeID int64
		var weight int
		if scanErr := prizeWeightRows.Scan(&userID, &prizeID, &weight); scanErr != nil {
			return nil, scanErr
		}
		if p, ok := participantMap[userID]; ok {
			p.PrizeWeights[prizeID] = weight
		}
	}
	if prizeWeightRows.Err() != nil {
		return nil, prizeWeightRows.Err()
	}

	return participants, nil
}

func createWinnerStmt(stmt *sql.Stmt, winner *models.Winner) error {
	result, err := stmt.Exec(winner.LotteryID, winner.ParticipantID, winner.PrizeID, winner.UserID, winner.Username, winner.PrizeName)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to fetch winner id: %w", err)
	}
	winner.ID = id
	return nil
}
