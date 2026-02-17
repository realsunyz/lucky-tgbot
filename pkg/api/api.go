package api

import (
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/realSunyz/lucky-tgbot/pkg/logger"
	"github.com/realSunyz/lucky-tgbot/pkg/models"
	"github.com/realSunyz/lucky-tgbot/pkg/service"
)

type LotteryRequest struct {
	Title             string  `json:"title"`
	Description       string  `json:"description"`
	DrawMode          string  `json:"draw_mode"`
	DrawTime          *string `json:"draw_time"`
	MaxEntries        *int    `json:"max_entries"`
	Prizes            []Prize `json:"prizes"`
	CreatorID         int64   `json:"creator_id"`
	IsWeightsDisabled bool    `json:"is_weights_disabled"`
}

type Prize struct {
	Name     string `json:"name"`
	Quantity int    `json:"quantity"`
}

type JoinRequest struct {
	UserID    int64  `json:"user_id"`
	Username  string `json:"username"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type WeightRequest struct {
	Weight int `json:"weight"`
}

type PrizeWeightRequest struct {
	PrizeID int64 `json:"prize_id"`
	Weight  int   `json:"weight"`
}

type LotteryResponse struct {
	*models.Lottery
	Prizes           []models.Prize  `json:"prizes"`
	ParticipantCount int             `json:"participant_count"`
	Winners          []models.Winner `json:"winners,omitempty"`
}

type Handler struct {
	service *service.LotteryService
}

func NewHandler(svc *service.LotteryService) *Handler {
	return &Handler{service: svc}
}

func SetupRoutes(app *fiber.App, svc *service.LotteryService) {
	h := NewHandler(svc)
	api := app.Group("/api")

	api.Get("/lottery/:id", h.getLottery)
	api.Post("/lottery/:id", h.createLottery)
	api.Post("/lottery/:id/join", h.joinLottery)
	api.Get("/lottery/:id/results", h.getResults)

	api.Put("/lottery/:id", h.tokenAuth, h.updateLottery)
	api.Get("/lottery/:id/participants", h.tokenAuth, h.getParticipants)
	api.Put("/lottery/:id/participants/:uid", h.tokenAuth, h.updateParticipantWeight)
	api.Post("/lottery/:id/participants/:uid/prize_weight", h.tokenAuth, h.updatePrizeWeight)
	api.Delete("/lottery/:id/participants/:uid/prize_weight/:prize_id", h.tokenAuth, h.deletePrizeWeight)
	api.Delete("/lottery/:id/participants/:uid", h.tokenAuth, h.removeParticipant)
	api.Post("/lottery/:id/draw", h.tokenAuth, h.drawLottery)
}

func (h *Handler) tokenAuth(c fiber.Ctx) error {
	lotteryID := c.Params("id")
	token := c.Query("token")
	if token == "" {
		return SendError(c, fiber.StatusUnauthorized, ERR_UNAUTHORIZED, "Token required")
	}

	if err := h.service.ValidateEditToken(lotteryID, token); err != nil {
		if errors.Is(err, service.ErrTokenInvalid) {
			return SendError(c, fiber.StatusUnauthorized, ERR_TOKEN_INVALID, "Invalid or expired token")
		}
		logger.Errorf("token validation error: %v", err)
		return SendError(c, fiber.StatusInternalServerError, ERR_INTERNAL, "Token validation failed")
	}

	return c.Next()
}

func (h *Handler) getLottery(c fiber.Ctx) error {
	id := c.Params("id")

	snapshot, err := h.service.GetLotterySnapshot(id)
	if err != nil {
		if errors.Is(err, service.ErrLotteryNotFound) {
			return SendError(c, fiber.StatusNotFound, ERR_NOT_FOUND, "Lottery not found")
		}
		logger.Errorf("failed to get lottery snapshot %s: %v", id, err)
		return SendInternalError(c)
	}

	return c.JSON(LotteryResponse{
		Lottery:          snapshot.Lottery,
		Prizes:           snapshot.Prizes,
		ParticipantCount: snapshot.ParticipantCount,
		Winners:          snapshot.Winners,
	})
}

func (h *Handler) createLottery(c fiber.Ctx) error {
	id := c.Params("id")

	var req LotteryRequest
	if err := c.Bind().Body(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid request body")
	}

	var drawTime *time.Time
	if req.DrawTime != nil && *req.DrawTime != "" {
		t, err := time.Parse(time.RFC3339, *req.DrawTime)
		if err != nil {
			return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid draw_time format")
		}
		drawTime = &t
	}

	prizes := make([]models.Prize, 0, len(req.Prizes))
	for _, p := range req.Prizes {
		prizes = append(prizes, models.Prize{Name: p.Name, Quantity: p.Quantity})
	}

	lottery, createdPrizes, err := h.service.CreateLottery(id, service.CreateLotteryInput{
		Title:             req.Title,
		Description:       req.Description,
		DrawMode:          req.DrawMode,
		DrawTime:          drawTime,
		MaxEntries:        req.MaxEntries,
		Prizes:            prizes,
		CreatorID:         req.CreatorID,
		IsWeightsDisabled: req.IsWeightsDisabled,
	})
	if err != nil {
		if errors.Is(err, service.ErrLotteryConflict) {
			return SendError(c, fiber.StatusConflict, ERR_CONFLICT, "Lottery already exists")
		}
		logger.Errorf("failed to create lottery %s: %v", id, err)
		return SendInternalError(c)
	}

	return c.Status(fiber.StatusCreated).JSON(LotteryResponse{Lottery: lottery, Prizes: createdPrizes})
}

func (h *Handler) updateLottery(c fiber.Ctx) error {
	id := c.Params("id")

	var req LotteryRequest
	if err := c.Bind().Body(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid request body")
	}

	var drawTime *time.Time
	if req.DrawTime != nil && *req.DrawTime != "" {
		t, err := time.Parse(time.RFC3339, *req.DrawTime)
		if err != nil {
			return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid draw_time format")
		}
		drawTime = &t
	}

	prizes := make([]models.Prize, 0, len(req.Prizes))
	for _, p := range req.Prizes {
		prizes = append(prizes, models.Prize{Name: p.Name, Quantity: p.Quantity})
	}

	lottery, updatedPrizes, err := h.service.UpdateLottery(id, service.UpdateLotteryInput{
		Title:             req.Title,
		Description:       req.Description,
		DrawMode:          req.DrawMode,
		DrawTime:          drawTime,
		MaxEntries:        req.MaxEntries,
		Prizes:            prizes,
		ReplacePrizes:     len(req.Prizes) > 0,
		IsWeightsDisabled: req.IsWeightsDisabled,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLotteryNotFound):
			return SendError(c, fiber.StatusNotFound, ERR_NOT_FOUND, "Lottery not found")
		case errors.Is(err, service.ErrLotteryEnded):
			return SendError(c, fiber.StatusBadRequest, ERR_LOTTERY_ENDED, "Cannot modify completed lottery")
		default:
			logger.Errorf("failed to update lottery %s: %v", id, err)
			return SendInternalError(c)
		}
	}

	return c.JSON(LotteryResponse{Lottery: lottery, Prizes: updatedPrizes})
}

func (h *Handler) joinLottery(c fiber.Ctx) error {
	id := c.Params("id")

	var req JoinRequest
	if err := c.Bind().Body(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid request body")
	}

	_, participant, err := h.service.JoinLottery(id, service.JoinInput{
		UserID:    req.UserID,
		Username:  req.Username,
		FirstName: req.FirstName,
		LastName:  req.LastName,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLotteryNotFound):
			return SendError(c, fiber.StatusNotFound, ERR_NOT_FOUND, "Lottery not found")
		case errors.Is(err, service.ErrLotteryNotActive):
			return SendError(c, fiber.StatusBadRequest, ERR_LOTTERY_NOT_ACTIVE, "Lottery is not active")
		case errors.Is(err, service.ErrLotteryFull):
			return SendError(c, fiber.StatusBadRequest, ERR_LOTTERY_FULL, "Lottery is full")
		case errors.Is(err, service.ErrParticipantExists):
			return SendError(c, fiber.StatusConflict, ERR_CONFLICT, "User already joined")
		default:
			logger.Errorf("failed to join lottery %s: %v", id, err)
			return SendInternalError(c)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(participant)
}

func (h *Handler) getParticipants(c fiber.Ctx) error {
	id := c.Params("id")

	participants, err := h.service.GetParticipants(id)
	if err != nil {
		logger.Errorf("failed to get participants for lottery %s: %v", id, err)
		return SendInternalError(c)
	}

	return c.JSON(participants)
}

func (h *Handler) updateParticipantWeight(c fiber.Ctx) error {
	lotteryID := c.Params("id")
	uidStr := c.Params("uid")
	userID, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid user ID")
	}

	var req WeightRequest
	if err := c.Bind().Body(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid request body")
	}
	if req.Weight < 0 {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Weight must be non-negative")
	}

	if err := h.service.UpdateParticipantWeight(lotteryID, userID, req.Weight); err != nil {
		logger.Errorf("failed to update participant weight lottery=%s user=%d: %v", lotteryID, userID, err)
		return SendInternalError(c)
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) deletePrizeWeight(c fiber.Ctx) error {
	lotteryID := c.Params("id")
	uidStr := c.Params("uid")
	prizeIDStr := c.Params("prize_id")

	userID, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid user ID")
	}
	prizeID, err := strconv.ParseInt(prizeIDStr, 10, 64)
	if err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid prize ID")
	}

	if err := h.service.DeletePrizeWeight(lotteryID, userID, prizeID); err != nil {
		logger.Errorf("failed to delete prize weight lottery=%s user=%d prize=%d: %v", lotteryID, userID, prizeID, err)
		return SendInternalError(c)
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) updatePrizeWeight(c fiber.Ctx) error {
	lotteryID := c.Params("id")
	uidStr := c.Params("uid")
	userID, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid user ID")
	}

	var req PrizeWeightRequest
	if err := c.Bind().Body(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid request body")
	}
	if req.Weight < 0 {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Weight must be non-negative")
	}

	if err := h.service.SetPrizeWeight(lotteryID, userID, req.PrizeID, req.Weight); err != nil {
		logger.Errorf("failed to set prize weight lottery=%s user=%d prize=%d: %v", lotteryID, userID, req.PrizeID, err)
		return SendInternalError(c)
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) removeParticipant(c fiber.Ctx) error {
	lotteryID := c.Params("id")
	uidStr := c.Params("uid")
	userID, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid user ID")
	}

	if err := h.service.RemoveParticipant(lotteryID, userID); err != nil {
		logger.Errorf("failed to remove participant lottery=%s user=%d: %v", lotteryID, userID, err)
		return SendInternalError(c)
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *Handler) getResults(c fiber.Ctx) error {
	id := c.Params("id")

	lottery, prizes, winners, err := h.service.GetResults(id)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLotteryNotFound):
			return SendError(c, fiber.StatusNotFound, ERR_NOT_FOUND, "Lottery not found")
		case errors.Is(err, service.ErrLotteryNotDrawn):
			return SendError(c, fiber.StatusBadRequest, ERR_LOTTERY_NOT_ACTIVE, "Lottery not yet drawn")
		default:
			logger.Errorf("failed to get results for lottery %s: %v", id, err)
			return SendInternalError(c)
		}
	}

	return c.JSON(fiber.Map{"lottery": lottery, "prizes": prizes, "winners": winners})
}

func (h *Handler) drawLottery(c fiber.Ctx) error {
	id := c.Params("id")

	winners, err := h.service.DrawLottery(id)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLotteryNotFound):
			return SendError(c, fiber.StatusNotFound, ERR_NOT_FOUND, "Lottery not found")
		case errors.Is(err, service.ErrLotteryEnded):
			return SendError(c, fiber.StatusBadRequest, ERR_LOTTERY_ENDED, "Lottery already completed")
		case errors.Is(err, service.ErrLotteryNotActive):
			return SendError(c, fiber.StatusBadRequest, ERR_LOTTERY_NOT_ACTIVE, "Lottery is not active")
		default:
			logger.Errorf("failed to draw lottery %s: %v", id, err)
			return SendInternalError(c)
		}
	}

	return c.JSON(fiber.Map{"success": true, "winners": winners})
}

func StartServer(svc *service.LotteryService) {
	app := fiber.New(fiber.Config{AppName: "Lucky TG Bot API"})
	app.Use("/assets", static.New("./web/dist/assets"))
	SetupRoutes(app, svc)
	app.Get("/*", func(c fiber.Ctx) error {
		return c.SendFile("./web/dist/index.html")
	})

	port := os.Getenv("API_PORT")
	if port == "" {
		port = "3000"
	}

	logger.Infof("starting HTTP server on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		logger.Fatalf("failed to start server: %v", err)
	}
}
