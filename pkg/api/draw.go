package api

import (
	"time"

	"github.com/realSunyz/lucky-tgbot/pkg/logger"
	"github.com/realSunyz/lucky-tgbot/pkg/service"
)

func StartTimedDrawChecker(svc *service.LotteryService) {
	run := func() {
		if err := svc.CheckAutoDrawLotteries(); err != nil {
			logger.Errorf("auto draw checker failed: %v", err)
		}
	}

	go func() {
		// Run once on startup to avoid waiting for the first tick.
		run()

		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			run()
		}
	}()
}
