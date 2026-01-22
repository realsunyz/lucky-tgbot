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

			// Handle slash-style custom commands (e.g., /摸, /亲)
			if strings.HasPrefix(inputText, "/") {
				slash.Execute(ctx, b, update)
				return
			}

			// Handle true-or-false style responses
			torf.Execute(ctx, b, update, r)
		}),
	}

	//b, err := bot.New(os.Getenv("TOKEN"), opts...)
	b, err := bot.New("7632804925:AAHdSuWkV-Jpxg4t1-MQu9MJyuyJN9vvqQA", opts...)
	if err != nil {
		log.Fatal("Error creating bot: ", err)
		return
	}

	log.Println("Bot started successfully")
	b.Start(ctx)
}
