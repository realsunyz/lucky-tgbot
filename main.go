package main

import (
	"context"
	"log"
	"math/rand"
	"os"
	"os/signal"
	"strings"
	"time"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"
	"github.com/realSunyz/lucky-tgbot/pkg/api"
	"github.com/realSunyz/lucky-tgbot/pkg/database"
	"github.com/realSunyz/lucky-tgbot/pkg/service"
	"github.com/realSunyz/lucky-tgbot/pkg/worker"
	"github.com/realSunyz/lucky-tgbot/plugin/lottery"
	"github.com/realSunyz/lucky-tgbot/plugin/slash"
	"github.com/realSunyz/lucky-tgbot/plugin/torf"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	source := rand.NewSource(time.Now().UnixNano())
	r := rand.New(source)

	opts := []bot.Option{
		bot.WithDefaultHandler(func(ctx context.Context, b *bot.Bot, update *models.Update) {
			if update.Message == nil {
				return
			}

			inputText := update.Message.Text
			if inputText == "" {
				return
			}

			// Handle create commands first
			if strings.HasPrefix(inputText, "/create") {
				log.Printf("Matched /create command: %s", inputText)
				lottery.HandleLotteryCommand(ctx, b, update)
				return
			}
			if strings.HasPrefix(inputText, "/edit") {
				lottery.HandleEditCommand(ctx, b, update)
				return
			}
			if strings.HasPrefix(inputText, "/start") {
				lottery.HandleStartCommand(ctx, b, update)
				return
			}

			// Handle slash-style custom commands
			if strings.HasPrefix(inputText, "/") {
				slash.Execute(ctx, b, update)
				return
			}

			// Handle true-or-false style responses
			torf.Execute(ctx, b, update, r)
		}),
	}

	b, err := bot.New(os.Getenv("TELEGRAM_BOT_TOKEN"), opts...)
	if err != nil {
		log.Fatal("Error creating bot: ", err)
		return
	}

	lotteryService := service.NewLotteryService(database.GetDB(), lottery.NewTelegramNotifier(b))
	lottery.SetService(lotteryService)

	// Start HTTP API server in background
	go api.StartServer(lotteryService)

	// Start timed lottery draw checker
	api.StartTimedDrawChecker(lotteryService)

	// Start cleanup worker
	worker.StartCleanupWorker()

	log.Println("Bot started successfully")
	b.Start(ctx)
}
