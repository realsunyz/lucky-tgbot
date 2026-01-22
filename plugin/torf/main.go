package torf

import (
	"context"
	"math/rand"
	"strings"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"
)

func randResponse(saidType int, r *rand.Rand) string {
	responsesMap := map[int][]string{
		1: {"有", "没有"},
		2: {"好", "不好"},
		3: {"是", "不是"},
		4: {"尊嘟", "假嘟"},
	}

	if responses, exists := responsesMap[saidType]; exists {
		return responses[r.Intn(len(responses))]
	}

	return ""
}

func Execute(ctx context.Context, b *bot.Bot, update *models.Update, r *rand.Rand) {
	if update.Message == nil {
		return
	}

	inputText := update.Message.Text
	var outputText string

	if strings.Contains(inputText, "有没有") {
		outputText = randResponse(1, r)
	} else if strings.Contains(inputText, "好不好") {
		outputText = randResponse(2, r)
	} else if strings.Contains(inputText, "是不是") {
		outputText = randResponse(3, r)
	} else if strings.Contains(inputText, "尊嘟假嘟") {
		outputText = randResponse(4, r)
	} else {
		return
	}

	b.SendMessage(ctx, &bot.SendMessageParams{
		ChatID:          update.Message.Chat.ID,
		Text:            outputText,
		ReplyParameters: &models.ReplyParameters{MessageID: update.Message.ID},
	})
}
