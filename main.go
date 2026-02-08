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

	// Start HTTP API server in background
	go api.StartServer()

	// Start timed lottery draw checker
	api.StartTimedDrawChecker()

	// Start cleanup worker
	worker.StartCleanupWorker()

	opts := []bot.Option{
		bot.WithDefaultHandler(func(ctx context.Context, b *bot.Bot, update *models.Update) {
			if update.Message == nil {
				return
			}

			inputText := update.Message.Text
			if inputText == "" {
				return
			}

			// Handle lottery commands first
			if strings.HasPrefix(inputText, "/lottery") {
				log.Printf("Matched /lottery command: %s", inputText)
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

	// Set bot instance for lottery plugin
	lottery.SetBot(b)

	log.Println("Bot started successfully")
	b.Start(ctx)
}
