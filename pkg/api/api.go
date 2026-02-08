package api

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/realSunyz/lucky-tgbot/pkg/database"
	"github.com/realSunyz/lucky-tgbot/pkg/models"
)

type LotteryRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	DrawMode    string  `json:"draw_mode"`
	DrawTime    *string `json:"draw_time"`
	MaxEntries  *int    `json:"max_entries"`
	Prizes      []Prize `json:"prizes"`
	CreatorID   int64   `json:"creator_id"`
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
	Prizes           []models.Prize       `json:"prizes"`
	Participants     []models.Participant `json:"participants,omitempty"`
	ParticipantCount int                  `json:"participant_count"`
	Winners          []models.Winner      `json:"winners,omitempty"`
}

func SetupRoutes(app *fiber.App) {
	api := app.Group("/api")

	// Public endpoints
	api.Get("/lottery/:id", getLottery)
	api.Post("/lottery/:id", createLottery)
	api.Post("/lottery/:id/join", joinLottery)
	api.Get("/lottery/:id/results", getResults)

	// Protected endpoints (require token query param)
	api.Put("/lottery/:id", tokenAuth, updateLottery)
	api.Get("/lottery/:id/participants", tokenAuth, getParticipants)
	api.Put("/lottery/:id/participants/:uid", tokenAuth, updateParticipantWeight)
	api.Post("/lottery/:id/participants/:uid/prize_weight", tokenAuth, updatePrizeWeight)
	api.Delete("/lottery/:id/participants/:uid", tokenAuth, removeParticipant)
	api.Post("/lottery/:id/draw", tokenAuth, drawLottery)
}

func tokenAuth(c fiber.Ctx) error {
	lotteryID := c.Params("id")
	token := c.Query("token")

	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Token required",
		})
	}

	valid, err := database.ValidateEditToken(lotteryID, token)
	if err != nil {
		log.Printf("Token validation error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Token validation failed",
		})
	}

	if !valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid or expired token",
		})
	}

	return c.Next()
}

func getLottery(c fiber.Ctx) error {
	id := c.Params("id")

	lottery, err := database.GetLottery(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if lottery == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Lottery not found"})
	}

	prizes, _ := database.GetPrizes(id)
	count, _ := database.GetParticipantCount(id)

	response := LotteryResponse{
		Lottery:          lottery,
		Prizes:           prizes,
		ParticipantCount: count,
	}

	if lottery.Status == "completed" {
		winners, _ := database.GetWinners(id)
		response.Winners = winners
	}

	return c.JSON(response)
}

func createLottery(c fiber.Ctx) error {
	id := c.Params("id")

	existing, err := database.GetLottery(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if existing != nil && existing.Status != "draft" {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Lottery already exists"})
	}

	var req LotteryRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var drawTime *time.Time
	if req.DrawTime != nil && *req.DrawTime != "" {
		t, err := time.Parse(time.RFC3339, *req.DrawTime)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid draw_time format"})
		}
		drawTime = &t
	}

	lottery := &models.Lottery{
		ID:          id,
		Title:       req.Title,
		Description: req.Description,
		CreatorID:   req.CreatorID,
		DrawMode:    req.DrawMode,
		DrawTime:    drawTime,
		MaxEntries:  req.MaxEntries,
		Status:      "active",
	}

	if existing != nil {
		lottery.CreatedAt = existing.CreatedAt
		if err := database.UpdateLottery(lottery); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		database.DeletePrizes(id)
	} else {
		if err := database.CreateLottery(lottery); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
	}

	for _, p := range req.Prizes {
		prize := &models.Prize{
			LotteryID: id,
			Name:      p.Name,
			Quantity:  p.Quantity,
		}
		if err := database.CreatePrize(prize); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
	}

	prizes, _ := database.GetPrizes(id)

	go notifyLotteryCreated(lottery, prizes)

	return c.Status(fiber.StatusCreated).JSON(LotteryResponse{
		Lottery: lottery,
		Prizes:  prizes,
	})
}

func updateLottery(c fiber.Ctx) error {
	id := c.Params("id")

	lottery, err := database.GetLottery(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if lottery == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Lottery not found"})
	}
	if lottery.Status == "completed" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot modify completed lottery"})
	}

	var req LotteryRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Title != "" {
		lottery.Title = req.Title
	}
	if req.Description != "" {
		lottery.Description = req.Description
	}
	if req.DrawMode != "" {
		lottery.DrawMode = req.DrawMode
	}
	if req.DrawTime != nil && *req.DrawTime != "" {
		t, _ := time.Parse(time.RFC3339, *req.DrawTime)
		lottery.DrawTime = &t
	}
	if req.MaxEntries != nil {
		lottery.MaxEntries = req.MaxEntries
	}

	if err := database.UpdateLottery(lottery); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if len(req.Prizes) > 0 {
		database.DeletePrizes(id)
		for _, p := range req.Prizes {
			prize := &models.Prize{
				LotteryID: id,
				Name:      p.Name,
				Quantity:  p.Quantity,
			}
			database.CreatePrize(prize)
		}
	}

	prizes, _ := database.GetPrizes(id)
	return c.JSON(LotteryResponse{
		Lottery: lottery,
		Prizes:  prizes,
	})
}

func joinLottery(c fiber.Ctx) error {
	id := c.Params("id")

	lottery, err := database.GetLottery(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if lottery == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Lottery not found"})
	}
	if lottery.Status != "active" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Lottery is not active"})
	}

	if lottery.MaxEntries != nil {
		count, _ := database.GetParticipantCount(id)
		if count >= *lottery.MaxEntries {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Lottery is full"})
		}
	}

	var req JoinRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	participant := &models.Participant{
		LotteryID: id,
		UserID:    req.UserID,
		Username:  req.Username,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Weight:    1,
	}

	if err := database.AddParticipant(participant); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if lottery.DrawMode == "full" && lottery.MaxEntries != nil {
		count, _ := database.GetParticipantCount(id)
		if count >= *lottery.MaxEntries {
			go performDraw(id)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(participant)
}

func getParticipants(c fiber.Ctx) error {
	id := c.Params("id")

	participants, err := database.GetParticipants(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(participants)
}

func updateParticipantWeight(c fiber.Ctx) error {
	lotteryID := c.Params("id")
	uidStr := c.Params("uid")
	userID, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req WeightRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Weight < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Weight must be non-negative"})
	}

	if err := database.UpdateParticipantWeight(lotteryID, int64(userID), req.Weight); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

func updatePrizeWeight(c fiber.Ctx) error {
	lotteryID := c.Params("id")
	uidStr := c.Params("uid")
	userID, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req PrizeWeightRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Weight < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Weight must be non-negative"})
	}

	if err := database.SetPrizeWeight(lotteryID, int64(userID), req.PrizeID, req.Weight); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

func removeParticipant(c fiber.Ctx) error {
	lotteryID := c.Params("id")
	uidStr := c.Params("uid")
	userID, err := strconv.ParseInt(uidStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	if err := database.RemoveParticipant(lotteryID, int64(userID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

func getResults(c fiber.Ctx) error {
	id := c.Params("id")

	lottery, err := database.GetLottery(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if lottery == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Lottery not found"})
	}

	if lottery.Status != "completed" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Lottery not yet drawn"})
	}

	winners, err := database.GetWinners(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	prizes, _ := database.GetPrizes(id)

	return c.JSON(fiber.Map{
		"lottery": lottery,
		"prizes":  prizes,
		"winners": winners,
	})
}

func drawLottery(c fiber.Ctx) error {
	id := c.Params("id")

	lottery, err := database.GetLottery(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if lottery == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Lottery not found"})
	}
	if lottery.Status == "completed" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Lottery already completed"})
	}

	winners, err := performDraw(id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"winners": winners,
	})
}

func StartServer() {
	database.GetDB()

	app := fiber.New(fiber.Config{
		AppName: "Lucky TG Bot API",
	})

	app.Use("/assets", static.New("./web/dist/assets"))

	SetupRoutes(app)

	app.Get("/*", func(c fiber.Ctx) error {
		return c.SendFile("./web/dist/index.html")
	})

	port := os.Getenv("API_PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("Starting HTTP server on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

var NotifyLotteryCreated func(lottery *models.Lottery, prizes []models.Prize)

func notifyLotteryCreated(lottery *models.Lottery, prizes []models.Prize) {
	if NotifyLotteryCreated != nil {
		NotifyLotteryCreated(lottery, prizes)
	}
}

var NotifyWinners func(lotteryID string, winners []models.Winner)
