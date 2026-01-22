package slash

import (
	"context"
	"fmt"
	"strings"
	"unicode"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"
)

func isASCII(s string) bool {
	for _, r := range s {
		if r > unicode.MaxASCII {
			return false
		}
	}
	return true
}

func isValid(inputText string) bool {
	if len(inputText) < 2 {
		return false
	}
	if isASCII(inputText[:2]) && !strings.HasPrefix(inputText, "/$") {
		return false
	}
	return true
}

func genName(firstName, lastName string) string {
	if lastName != "" {
		return fmt.Sprintf("%s %s", firstName, lastName)
	}
	return firstName
}

func genLink(update *models.Update) (string, string) {
	msg := update.Message
	senderURI := fmt.Sprintf("tg://user?id=%d", msg.From.ID)
	senderName := genName(msg.From.FirstName, msg.From.LastName)

	// Message is sent on behalf of a Channel or Group
	if msg.SenderChat != nil {
		chatID := -1 * (msg.SenderChat.ID % 10000000000)
		senderURI = fmt.Sprintf("https://t.me/c/%d", chatID)
		senderName = msg.SenderChat.Title
	}

	// Message is NOT a reply to others by default
	replyToURI := ""
	replyToName := "自己"

	// Message is a reply to others
	if msg.ReplyToMessage != nil {
		replyToURI = fmt.Sprintf("tg://user?id=%d", msg.ReplyToMessage.From.ID)
		replyToName = genName(msg.ReplyToMessage.From.FirstName, msg.ReplyToMessage.From.LastName)

		// Message replied to was sent on behalf of a Channel or Group
		if msg.ReplyToMessage.SenderChat != nil {
			chatID := -1 * (msg.ReplyToMessage.SenderChat.ID % 10000000000)
			replyToURI = fmt.Sprintf("https://t.me/c/%d", chatID)
			replyToName = msg.ReplyToMessage.SenderChat.Title
		}
	}

	// Feature: Specify the user who is the target of the action using an At Sign (@)
	if len(msg.Entities) != 0 {
		if msg.Entities[0].Type == models.MessageEntityTypeTextMention {
			// User does NOT have a public username
			replyToURI = fmt.Sprintf("tg://user?id=%d", msg.Entities[0].User.ID)
			replyToName = genName(msg.Entities[0].User.FirstName, msg.Entities[0].User.LastName)
		} else if msg.Entities[0].Type == models.MessageEntityTypeMention {
			// User have a public username
			t := strings.Index(msg.Text, " @")
			if t != -1 {
				pubUserName := msg.Text[t:]
				replyToName = strings.TrimSpace(pubUserName)
			}
			// User ID can NOT be obtained if only public usernames are provided
			replyToURI = ""
		}
	}

	senderLink := fmt.Sprintf("[%s](%s)", senderName, senderURI)
	replyToLink := fmt.Sprintf("[%s](%s)", replyToName, replyToURI)

	if replyToURI == "" {
		replyToLink = fmt.Sprintf("%s", replyToName)
	}

	return senderLink, replyToLink
}

func Execute(ctx context.Context, b *bot.Bot, update *models.Update) {
	if update.Message == nil {
		return
	}

	inputText := update.Message.Text

	if !isValid(inputText) {
		return
	}

	actions := strings.SplitN(strings.Replace(inputText, "$", "", 1)[1:], " ", 3)

	if len(actions) != 1 && len(actions) != 2 && len(actions) != 3 {
		return
	}

	senderLink, replyToLink := genLink(update)

	outputText := fmt.Sprintf("%s %s了 %s", senderLink, actions[0], replyToLink)
	if len(actions) == 2 || len(actions) == 3 {
		outputText = fmt.Sprintf("%s %s了 %s %s", senderLink, actions[0], replyToLink, actions[1])
	}

	b.SendMessage(ctx, &bot.SendMessageParams{
		ChatID:          update.Message.Chat.ID,
		Text:            outputText,
		ParseMode:       models.ParseModeMarkdown,
		ReplyParameters: &models.ReplyParameters{MessageID: update.Message.ID},
	})
}
