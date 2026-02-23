package worker

import (
	"time"

	"github.com/realSunyz/lucky-tgbot/pkg/database"
	"github.com/realSunyz/lucky-tgbot/pkg/logger"
)

func StartCleanupWorker() {
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			if err := cleanupDrafts(); err != nil {
				logger.Errorf("error cleaning up drafts: %v", err)
			}
			if err := cleanupExpiredTokens(); err != nil {
				logger.Errorf("error cleaning up expired tokens: %v", err)
			}
			if err := checkpointWAL(); err != nil {
				logger.Errorf("error checkpointing WAL: %v", err)
			}
			if err := optimizeSQLite(); err != nil {
				logger.Errorf("error optimizing sqlite: %v", err)
			}
		}
	}()
}

func cleanupDrafts() error {
	db := database.GetDB()
	cutoff := time.Now().UTC().Add(-1 * time.Hour)
	_, err := db.Exec(`DELETE FROM lotteries WHERE status = 'draft' AND created_at < ?`, cutoff)
	if err != nil {
		return err
	}
	return nil
}

func cleanupExpiredTokens() error {
	db := database.GetDB()
	_, err := db.Exec(`DELETE FROM edit_tokens WHERE expires_at < ?`, time.Now().UTC())
	if err != nil {
		return err
	}
	return nil
}

func checkpointWAL() error {
	db := database.GetDB()
	_, err := db.Exec(`PRAGMA wal_checkpoint(TRUNCATE)`)
	return err
}

func optimizeSQLite() error {
	db := database.GetDB()
	_, err := db.Exec(`PRAGMA optimize`)
	return err
}
