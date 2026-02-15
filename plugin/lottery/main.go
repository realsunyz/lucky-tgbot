package lottery

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/go-telegram/bot"
	tgmodels "github.com/go-telegram/bot/models"
	dbmodels "github.com/realSunyz/lucky-tgbot/pkg/models"
	"github.com/realSunyz/lucky-tgbot/pkg/service"
)

var lotteryService *service.LotteryService

func SetService(svc *service.LotteryService) {
	lotteryService = svc
}

type TelegramNotifier struct {
	bot *bot.Bot
}

func NewTelegramNotifier(b *bot.Bot) *TelegramNotifier {
	return &TelegramNotifier{bot: b}
}

func (n *TelegramNotifier) LotteryCreated(lottery *dbmodels.Lottery, prizes []dbmodels.Prize) {
	sendLotteryCreatedMessage(context.Background(), n.bot, lottery, prizes)
}

func (n *TelegramNotifier) WinnersDrawn(lottery *dbmodels.Lottery, winners []dbmodels.Winner) {
	sendWinnerNotification(context.Background(), n.bot, lottery, winners)
}

func getWebDomain() string {
	return strings.TrimSuffix(os.Getenv("WEB_DOMAIN"), "/")
}

func HandleLotteryCommand(ctx context.Context, b *bot.Bot, update *tgmodels.Update) {
	if lotteryService == nil {
		log.Printf("lottery service is not initialized")
		return
	}

	if update.Message == nil {
		return
	}

	if update.Message.Chat.Type != "private" {
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "❌ 请在私聊中使用此命令创建抽奖",
		})
		return
	}

	lottery, err := lotteryService.CreateDraftLottery(update.Message.From.ID)
	if err != nil {
		log.Printf("failed to create draft lottery: %v", err)
		b.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: update.Message.Chat.ID,
			Text:   "❌ 创建抽奖失败，请稍后重试",
		})
		return
	}

	createLink := fmt.Sprintf("%s/create/%s", getWebDomain(), lottery.ID)
	message := fmt.Sprintf("新抽奖创建成功\n\n请在 30 分钟内点击下方链接完成抽奖设置:\n%s", createLink)

	_, sendErr := b.SendMessage(ctx, &bot.SendMessageParams{
		ChatID:    update.Message.Chat.ID,
		Text:      message,
		ParseMode: tgmodels.ParseModeHTML,
	})
	if sendErr != nil {
		log.Printf("failed to send create message: %v", sendErr)
	}
}

func HandleEditCommand(ctx context.Context, b *bot.Bot, update *tgmodels.Update) {
	if lotteryService == nil {
		log.Printf("lottery service is not initialized")
		return
	}

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
			ParseMode: tgmodels.ParseModeHTML,
		})
		return
	}

	lotteryID := parts[1]
	token, lottery, err := lotteryService.CreateEditToken(lotteryID, update.Message.From.ID, time.Hour)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLotteryNotFound):
			b.SendMessage(ctx, &bot.SendMessageParams{ChatID: update.Message.Chat.ID, Text: "❌ 未找到该抽奖"})
		case errors.Is(err, service.ErrPermissionDenied):
			b.SendMessage(ctx, &bot.SendMessageParams{ChatID: update.Message.Chat.ID, Text: "❌ 您不是该抽奖的创建者"})
		default:
			b.SendMessage(ctx, &bot.SendMessageParams{ChatID: update.Message.Chat.ID, Text: "❌ 生成编辑链接失败, 请稍后重试"})
		}
		return
	}

	editLink := fmt.Sprintf("%s/edit/%s?token=%s", getWebDomain(), lotteryID, token)
	message := fmt.Sprintf("编辑抽奖\n\n抽奖 ID: <code>%s</code>\n标题: %s\n\n编辑链接有效期 1 小时：\n%s", lotteryID, lottery.Title, editLink)

	b.SendMessage(ctx, &bot.SendMessageParams{
		ChatID:    update.Message.Chat.ID,
		Text:      message,
		ParseMode: tgmodels.ParseModeHTML,
	})
}

func HandleStartCommand(ctx context.Context, b *bot.Bot, update *tgmodels.Update) {
	if update.Message == nil {
		return
	}

	text := strings.TrimSpace(update.Message.Text)
	parts := strings.Fields(text)
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

func handleJoin(ctx context.Context, b *bot.Bot, update *tgmodels.Update, lotteryID string) {
	if lotteryService == nil || update.Message == nil {
		return
	}

	user := update.Message.From
	lottery, _, err := lotteryService.JoinLottery(lotteryID, service.JoinInput{
		UserID:    user.ID,
		Username:  user.Username,
		FirstName: user.FirstName,
		LastName:  user.LastName,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLotteryNotFound):
			b.SendMessage(ctx, &bot.SendMessageParams{ChatID: update.Message.Chat.ID, Text: "❌ 找不到该抽奖"})
		case errors.Is(err, service.ErrLotteryNotActive):
			msg := "❌ 该抽奖未开始"
			if lottery != nil {
				switch lottery.Status {
				case "completed":
					msg = "❌ 该抽奖已结束"
				case "draft":
					msg = "❌ 该抽奖尚未发布"
				}
			}
			b.SendMessage(ctx, &bot.SendMessageParams{ChatID: update.Message.Chat.ID, Text: msg})
		case errors.Is(err, service.ErrLotteryFull):
			b.SendMessage(ctx, &bot.SendMessageParams{ChatID: update.Message.Chat.ID, Text: "❌ 该抽奖名额已满"})
		case errors.Is(err, service.ErrParticipantExists):
			b.SendMessage(ctx, &bot.SendMessageParams{ChatID: update.Message.Chat.ID, Text: fmt.Sprintf("您已参与抽奖 %s, 请勿重复点击.", lotteryID)})
		default:
			log.Printf("failed to join lottery %s: %v", lotteryID, err)
			b.SendMessage(ctx, &bot.SendMessageParams{ChatID: update.Message.Chat.ID, Text: "❌ 参与失败，请稍后重试"})
		}
		return
	}

	b.SendMessage(ctx, &bot.SendMessageParams{
		ChatID: update.Message.Chat.ID,
		Text: fmt.Sprintf("参加抽奖成功\n\n抽奖 ID: %s\n抽奖标题: %s\n\n更多详情请前往网页端查看:\n%s/lottery/%s",
			lottery.ID, lottery.Title, getWebDomain(), lottery.ID),
		ParseMode: tgmodels.ParseModeHTML,
	})
}

func sendLotteryCreatedMessage(ctx context.Context, b *bot.Bot, lottery *dbmodels.Lottery, prizes []dbmodels.Prize) {
	if b == nil {
		return
	}

	var prizeLines []string
	for _, p := range prizes {
		prizeLines = append(prizeLines, fmt.Sprintf("- %s × %d", p.Name, p.Quantity))
	}
	prizesText := strings.Join(prizeLines, "\n")
	lotteryLink := fmt.Sprintf("%s/lottery/%s", getWebDomain(), lottery.ID)
	message := fmt.Sprintf("抽奖 ID: %s\n抽奖标题: %s\n奖品内容:\n%s\n\n更多详情请前往网页端查看:\n%s", lottery.ID, lottery.Title, prizesText, lotteryLink)

	botUser, err := b.GetMe(ctx)
	botUsername := ""
	if err == nil {
		botUsername = botUser.Username
	}

	var joinButton tgmodels.InlineKeyboardButton
	if botUsername != "" {
		deepLink := fmt.Sprintf("https://t.me/%s?start=join_%s", botUsername, lottery.ID)
		joinButton = tgmodels.InlineKeyboardButton{Text: ">>> 点击参与 <<<", URL: deepLink}
	} else if strings.HasPrefix(getWebDomain(), "https://") {
		joinButton = tgmodels.InlineKeyboardButton{Text: ">>> 点击参与 <<<", URL: lotteryLink}
	}

	params := &bot.SendMessageParams{ChatID: lottery.CreatorID, Text: message, ParseMode: tgmodels.ParseModeHTML}
	if joinButton.Text != "" {
		params.ReplyMarkup = &tgmodels.InlineKeyboardMarkup{InlineKeyboard: [][]tgmodels.InlineKeyboardButton{{joinButton}}}
	}
	b.SendMessage(ctx, params)
}

func sendWinnerNotification(ctx context.Context, b *bot.Bot, lottery *dbmodels.Lottery, winners []dbmodels.Winner) {
	if b == nil || lottery == nil || len(winners) == 0 {
		return
	}

	resultLink := fmt.Sprintf("%s/lottery/%s", getWebDomain(), lottery.ID)
	userWins := make(map[int64][]string)
	for _, w := range winners {
		userWins[w.UserID] = append(userWins[w.UserID], w.PrizeName)
	}

	creatorName := "发起者"
	if chat, err := b.GetChat(ctx, &bot.GetChatParams{ChatID: lottery.CreatorID}); err == nil {
		if chat.Username != "" {
			creatorName = "@" + chat.Username
		} else if chat.FirstName != "" {
			creatorName = chat.FirstName
		}
	}

	for userID, prizes := range userWins {
		prizeText := strings.Join(prizes, ", ")
		message := fmt.Sprintf("中奖通知\n\n恭喜您在抽奖活动 %s 中获奖! \n抽奖标题: %s\n获得奖品: %s\n\n请及时联系 <a href=\"tg://user?id=%d\">%s</a> 领取奖品.",
			lottery.Title, lottery.Title, prizeText, lottery.CreatorID, creatorName)
		b.SendMessage(ctx, &bot.SendMessageParams{ChatID: userID, Text: message, ParseMode: tgmodels.ParseModeHTML})
	}

	var winnerLines []string
	for _, w := range winners {
		winnerLines = append(winnerLines, fmt.Sprintf("- %d 获得了 \"%s\"", w.UserID, w.PrizeName))
	}
	creatorMessage := fmt.Sprintf("开奖已完成\n\n抽奖 ID: %s\n抽奖标题: %s\n中奖用户列表:\n%s\n\n更多详情请前往网页端查看:\n%s",
		lottery.ID, lottery.Title, strings.Join(winnerLines, "\n"), resultLink)
	b.SendMessage(ctx, &bot.SendMessageParams{ChatID: lottery.CreatorID, Text: creatorMessage})
}
