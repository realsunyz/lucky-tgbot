package api

import (
	"log"
	"time"

	"github.com/realSunyz/lucky-tgbot/pkg/service"
)

func StartTimedDrawChecker(svc *service.LotteryService) {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			if err := svc.CheckTimedLotteries(); err != nil {
				log.Printf("timed draw checker failed: %v", err)
			}
		}
	}()
}
