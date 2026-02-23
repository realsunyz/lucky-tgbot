package api

import (
	"context"
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/etag"
	"github.com/gofiber/fiber/v3/middleware/favicon"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/gofiber/fiber/v3/middleware/timeout"
	"github.com/realSunyz/lucky-tgbot/pkg/database"
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

type AddParticipantRequest struct {
	UserID int64 `json:"user_id"`
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

const (
	writeTimeout     = 8 * time.Second
	joinLimitMax     = 60
	joinLimitWindow  = time.Minute
	editLimitMax     = 30
	editLimitWindow  = time.Minute
	drawLimitMax     = 20
	drawLimitWindow  = time.Minute
	readinessTimeout = 2 * time.Second
)

func NewHandler(svc *service.LotteryService) *Handler {
	return &Handler{service: svc}
}

func withWriteTimeout(handler fiber.Handler) fiber.Handler {
	return timeout.New(handler, timeout.Config{
		Timeout: writeTimeout,
		OnTimeout: func(c fiber.Ctx) error {
			return SendError(c, fiber.StatusRequestTimeout, ERR_REQUEST_TIMEOUT, "Request timeout")
		},
	})
}

func lotteryScopedLimiter(max int, expiration time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        max,
		Expiration: expiration,
		KeyGenerator: func(c fiber.Ctx) string {
			return c.IP() + "|" + c.Route().Path + "|" + c.Params("id")
		},
		LimitReached: func(c fiber.Ctx) error {
			return SendError(c, fiber.StatusTooManyRequests, ERR_RATE_LIMITED, "Too many requests")
		},
	})
}

func SetupRoutes(app *fiber.App, svc *service.LotteryService) {
	h := NewHandler(svc)
	api := app.Group("/api")
	joinLimiter := lotteryScopedLimiter(joinLimitMax, joinLimitWindow)
	editLimiter := lotteryScopedLimiter(editLimitMax, editLimitWindow)
	drawLimiter := lotteryScopedLimiter(drawLimitMax, drawLimitWindow)

	api.Get("/lottery/:id", h.getLottery)
	api.Get("/stats", h.getStats)
	api.Post("/lottery/:id", editLimiter, withWriteTimeout(h.createLottery))
	api.Post("/lottery/:id/join", joinLimiter, withWriteTimeout(h.joinLottery))
	api.Get("/lottery/:id/results", h.getResults)

	api.Put("/lottery/:id", editLimiter, h.tokenAuth, withWriteTimeout(h.updateLottery))
	api.Get("/lottery/:id/participants", h.tokenAuth, h.getParticipants)
	api.Post("/lottery/:id/participants", editLimiter, h.tokenAuth, withWriteTimeout(h.addParticipant))
	api.Put("/lottery/:id/participants/:uid", editLimiter, h.tokenAuth, withWriteTimeout(h.updateParticipantWeight))
	api.Post("/lottery/:id/participants/:uid/prize_weight", editLimiter, h.tokenAuth, withWriteTimeout(h.updatePrizeWeight))
	api.Delete("/lottery/:id/participants/:uid/prize_weight/:prize_id", editLimiter, h.tokenAuth, withWriteTimeout(h.deletePrizeWeight))
	api.Delete("/lottery/:id/participants/:uid", editLimiter, h.tokenAuth, withWriteTimeout(h.removeParticipant))
	api.Post("/lottery/:id/draw", drawLimiter, h.tokenAuth, withWriteTimeout(h.drawLottery))
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

func (h *Handler) getStats(c fiber.Ctx) error {
	stats, err := h.service.GetLotteryStats()
	if err != nil {
		logger.Errorf("failed to get lottery stats: %v", err)
		return SendInternalError(c)
	}
	return c.JSON(stats)
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

func (h *Handler) addParticipant(c fiber.Ctx) error {
	id := c.Params("id")

	var req AddParticipantRequest
	if err := c.Bind().Body(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "Invalid request body")
	}

	if req.UserID == 0 {
		return SendError(c, fiber.StatusBadRequest, ERR_BAD_REQUEST, "User ID is required")
	}

	participant, err := h.service.AddParticipant(id, service.JoinInput{
		UserID: req.UserID,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLotteryNotFound):
			return SendError(c, fiber.StatusNotFound, ERR_NOT_FOUND, "Lottery not found")
		case errors.Is(err, service.ErrLotteryEnded):
			return SendError(c, fiber.StatusBadRequest, ERR_LOTTERY_ENDED, "Lottery already completed")
		case errors.Is(err, service.ErrParticipantExists):
			return SendError(c, fiber.StatusConflict, ERR_CONFLICT, "User already joined")
		default:
			logger.Errorf("failed to add participant locally lottery=%s: %v", id, err)
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
	app.Use(recover.New())
	app.Use(compress.New(compress.Config{Level: compress.LevelBestSpeed}))
	app.Use(etag.New())
	app.Use(favicon.New(favicon.Config{File: "./web/dist/favicon.ico"}))

	app.Get(healthcheck.LivenessEndpoint, healthcheck.New())
	app.Get(healthcheck.ReadinessEndpoint, healthcheck.New(healthcheck.Config{
		Probe: func(c fiber.Ctx) bool {
			ctx, cancel := context.WithTimeout(c.Context(), readinessTimeout)
			defer cancel()
			return database.GetDB().PingContext(ctx) == nil
		},
	}))

	app.Use("/assets", static.New("./web/dist/assets"))
	SetupRoutes(app, svc)
	app.Get("/robots.txt", func(c fiber.Ctx) error {
		return c.SendFile("./web/dist/robots.txt")
	})
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
