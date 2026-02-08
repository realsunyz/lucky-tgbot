package lottery

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"
	"github.com/google/uuid"
	"github.com/realSunyz/lucky-tgbot/pkg/api"
	"github.com/realSunyz/lucky-tgbot/pkg/database"
	dbmodels "github.com/realSunyz/lucky-tgbot/pkg/models"
)

var botInstance *bot.Bot

func SetBot(b *bot.Bot) {
	botInstance = b

	api.NotifyLotteryCreated = func(lottery *dbmodels.Lottery, prizes []dbmodels.Prize) {
		sendLotteryCreatedMessage(context.Background(), lottery, prizes)
	}

	api.NotifyWinners = func(lotteryID string, winners []dbmodels.Winner) {
		sendWinnerNotification(context.Background(), lotteryID, winners)
	}
}

func getWebDomain() string {
	return strings.TrimSuffix(os.Getenv("WEB_DOMAIN"), "/")
}

func HandleLotteryCommand(ctx context.Context, b *bot.Bot, update *models.Update) {
	log.Printf("HandleLotteryCommand called")

	if update.Message == nil {
		log.Printf("update.Message is nil")
		return
	}

	log.Printf("Chat Type: %s, Chat ID: %d", update.Message.Chat.Type, update.Message.Chat.ID)

	if update.Message.Chat.Type != "private" {
		log.Printf("Not a private chat, sending error")
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "❌ 请在私聊中使用此命令创建抽奖",
		})
		return
	}

	log.Printf("Generating lottery ID...")
	lotteryID, err := database.GenerateLotteryID()
	if err != nil {
		log.Printf("Failed to generate lottery ID: %v", err)
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "❌ 生成抽奖 ID 失败，请稍后重试",
		})
		return
	}
	log.Printf("Generated lottery ID: %s", lotteryID)

	lottery := &dbmodels.Lottery{
		ID:        lotteryID,
		CreatorID: update.Message.From.ID,
		Status:    "draft",
		DrawMode:  "manual",
	}
	log.Printf("Creating lottery in database...")
	if err := database.CreateLottery(lottery); err != nil {
		log.Printf("Failed to create lottery: %v", err)
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "❌ 创建抽奖失败，请稍后重试",
		})
		return
	}
	log.Printf("Lottery created successfully")

	webDomain := getWebDomain()
	createLink := fmt.Sprintf("%s/create/%s", webDomain, lotteryID)
	log.Printf("Create link: %s", createLink)

	message := fmt.Sprintf("新抽奖创建成功\n\n"+
		"请在 30 分钟内点击下方链接完成抽奖设置:\n%s",
		createLink)

	log.Printf("Sending message to chat %d...", update.Message.Chat.ID)

	var sendErr error
	if strings.HasPrefix(webDomain, "https://") {
		_, sendErr = b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID:    update.Message.Chat.ID,
			Text:      message,
			ParseMode: models.ParseModeHTML,
		})
	} else {
		_, sendErr = b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID:    update.Message.Chat.ID,
			Text:      message,
			ParseMode: models.ParseModeHTML,
		})
	}
	if sendErr != nil {
		log.Printf("Failed to send message: %v", sendErr)
	} else {
		log.Printf("Message sent successfully")
	}
}

func HandleEditCommand(ctx context.Context, b *bot.Bot, update *models.Update) {
	if update.Message == nil {
		return
	}

	if update.Message.Chat.Type != "private" {
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "❌ 请在私聊中使用此命令",
		})
		return
	}

	text := strings.TrimSpace(update.Message.Text)
	parts := strings.Fields(text)
	if len(parts) < 2 {
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID:    update.Message.Chat.ID,
			Text:      "❌ 请提供抽奖 ID\n\n用法: <code>/edit 123456</code>",
			ParseMode: models.ParseModeHTML,
		})
		return
	}

	lotteryID := parts[1]

	lottery, err := database.GetLottery(lotteryID)
	if err != nil || lottery == nil {
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "❌ 未找到该抽奖",
		})
		return
	}

	if lottery.CreatorID != update.Message.From.ID {
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "❌ 您不是该抽奖的创建者",
		})
		return
	}

	token := uuid.New().String()
	editToken := &dbmodels.EditToken{
		Token:     token,
		LotteryID: lotteryID,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	if err := database.CreateEditToken(editToken); err != nil {
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "❌ 生成编辑链接失败, 请稍后重试",
		})
		return
	}

	webDomain := getWebDomain()
	editLink := fmt.Sprintf("%s/edit/%s?token=%s", webDomain, lotteryID, token)

	message := fmt.Sprintf("编辑抽奖\n\n"+
		"抽奖 ID: <code>%s</code>\n"+
		"标题: %s\n\n"+
		"编辑链接有效期 1 小时：\n%s",
		lotteryID, lottery.Title, editLink)

	if strings.HasPrefix(webDomain, "https://") {
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID:    update.Message.Chat.ID,
			Text:      message,
			ParseMode: models.ParseModeHTML,
		})
	} else {
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID:    update.Message.Chat.ID,
			Text:      message,
			ParseMode: models.ParseModeHTML,
		})
	}

}

func HandleStartCommand(ctx context.Context, b *bot.Bot, update *models.Update) {
	if update.Message == nil {
		return
	}

	text := strings.TrimSpace(update.Message.Text)
	parts := strings.Fields(text)

	// Just /start without args
	if len(parts) < 2 {
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "Hi there!",
		})
		return
	}

	arg := parts[1]
	if strings.HasPrefix(arg, "join_") {
		lotteryID := strings.TrimPrefix(arg, "join_")
		handleJoin(ctx, b, update, lotteryID)
	}
}

func handleJoin(ctx context.Context, b *bot.Bot, update *models.Update, lotteryID string) {
	log.Printf("User %d attempting to join lottery %s", update.Message.From.ID, lotteryID)

	// 1. Get lottery
	lottery, err := database.GetLottery(lotteryID)
	if err != nil || lottery == nil {
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "❌ 找不到该抽奖",
		})
		return
	}

	// 2. Check status
	if lottery.Status != "active" {
		msg := "❌ 该抽奖未开始"
		if lottery.Status == "completed" {
			msg = "❌ 该抽奖已结束"
		} else if lottery.Status == "draft" {
			msg = "❌ 该抽奖尚未发布"
		}
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   msg,
		})
		return
	}

	// 3. Add participant
	user := update.Message.From
	participant := &dbmodels.Participant{
		LotteryID: lotteryID,
		UserID:    user.ID,
		Username:  user.Username,
		FirstName: user.FirstName,
		LastName:  user.LastName,
	}

	if err := database.AddParticipant(participant); err != nil {
		// Check for duplicate entry (constraint violation)
		// SQLite error for constraint violation usually contains "UNIQUE constraint failed"
		if strings.Contains(err.Error(), "UNIQUE constraint") || strings.Contains(err.Error(), "constraint failed") {
			b.SendMessage(ctx, &bot.SendMessageParams{
				ChatID: update.Message.Chat.ID,
				Text:   fmt.Sprintf("您已参与抽奖 %s, 请勿重复点击.", lotteryID),
			})
		} else {
			log.Printf("Failed to add participant: %v", err)
			b.SendMessage(ctx, &bot.SendMessageParams{
				ChatID: update.Message.Chat.ID,
				Text:   "❌ 参与失败，请稍后重试",
			})
		}
		return
	}

	b.SendMessage(ctx, &bot.SendMessageParams{
		ChatID: update.Message.Chat.ID,
		Text: fmt.Sprintf("参加抽奖成功\n\n抽奖 ID: %s\n抽奖标题: %s\n\n更多详情请前往网页端查看:\n%s/lottery/%s",
			lottery.ID, lottery.Title, getWebDomain(), lottery.ID),
		ParseMode: models.ParseModeHTML,
	})
}

func sendLotteryCreatedMessage(ctx context.Context, lottery *dbmodels.Lottery, prizes []dbmodels.Prize) {
	if botInstance == nil {
		return
	}

	var prizeLines []string
	for _, p := range prizes {
		prizeLines = append(prizeLines, fmt.Sprintf("- %s × %d", p.Name, p.Quantity))
	}
	prizesText := strings.Join(prizeLines, "\n")

	webDomain := getWebDomain()
	lotteryLink := fmt.Sprintf("%s/lottery/%s", webDomain, lottery.ID)

	message := fmt.Sprintf("抽奖 ID: %s\n"+
		"抽奖标题: %s\n"+
		"奖品内容:\n%s\n\n"+
		"更多详情请前往网页端查看:\n%s",
		lottery.ID, lottery.Title, prizesText, lotteryLink)

	// Get bot username for deep link
	var botUsername string
	if botInstance != nil {
		if botUser, err := botInstance.GetMe(ctx); err == nil {
			botUsername = botUser.Username
		}
	}

	var joinButton models.InlineKeyboardButton
	if botUsername != "" {
		deepLink := fmt.Sprintf("https://t.me/%s?start=join_%s", botUsername, lottery.ID)
		joinButton = models.InlineKeyboardButton{Text: ">>> 点击参与 <<<", URL: deepLink}
	} else if strings.HasPrefix(webDomain, "https://") {
		joinButton = models.InlineKeyboardButton{Text: ">>> 点击参与 <<<", URL: lotteryLink}
	}

	params := &bot.SendMessageParams{
		ChatID:    lottery.CreatorID,
		Text:      message,
		ParseMode: models.ParseModeHTML,
	}

	if joinButton.Text != "" {
		params.ReplyMarkup = &models.InlineKeyboardMarkup{
			InlineKeyboard: [][]models.InlineKeyboardButton{
				{joinButton},
			},
		}
	}

	botInstance.SendMessage(ctx, params)
}

func sendWinnerNotification(ctx context.Context, lotteryID string, winners []dbmodels.Winner) {
	if botInstance == nil || len(winners) == 0 {
		return
	}

	lottery, _ := database.GetLottery(lotteryID)
	if lottery == nil {
		return
	}

	webDomain := getWebDomain()
	resultLink := fmt.Sprintf("%s/lottery/%s", webDomain, lotteryID)

	userWins := make(map[int64][]string)
	for _, w := range winners {
		userWins[w.UserID] = append(userWins[w.UserID], w.PrizeName)
	}

	creatorName := "发起者"
	if chat, err := botInstance.GetChat(ctx, &bot.GetChatParams{ChatID: lottery.CreatorID}); err == nil {
		if chat.Username != "" {
			creatorName = "@" + chat.Username
		} else if chat.FirstName != "" {
			creatorName = chat.FirstName
		}
	}

	for userID, prizes := range userWins {
		prizeText := strings.Join(prizes, ", ")
		message := fmt.Sprintf("中奖通知\n\n"+
			"恭喜您在抽奖活动 %s 中获奖! \n"+
			"抽奖标题: %s\n"+
			"获得奖品: %s\n\n"+
			"请及时联系 <a href=\"tg://user?id=%d\">%s</a> 领取奖品.",
			lottery.Title, lottery.Title, prizeText, lottery.CreatorID, creatorName)

		botInstance.SendMessage(ctx, &bot.SendMessageParams{
			ChatID:    userID,
			Text:      message,
			ParseMode: models.ParseModeHTML,
		})
	}

	var winnerLines []string
	for _, w := range winners {
		winnerLines = append(winnerLines, fmt.Sprintf("- %d 获得了 \"%s\"", w.UserID, w.PrizeName))
	}

	creatorMessage := fmt.Sprintf("开奖已完成\n\n"+
		"抽奖 ID: %s\n"+
		"抽奖标题: %s\n"+
		"中奖用户列表:\n%s\n\n"+
		"更多详情请前往网页端查看:\n%s",
		lottery.ID, lottery.Title, strings.Join(winnerLines, "\n"), resultLink)

	botInstance.SendMessage(ctx, &bot.SendMessageParams{
		ChatID: lottery.CreatorID,
		Text:   creatorMessage,
	})
}
