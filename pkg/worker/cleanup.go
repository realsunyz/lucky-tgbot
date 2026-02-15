package worker

import (
	"log"
	"time"

	"github.com/realSunyz/lucky-tgbot/pkg/database"
)

func StartCleanupWorker() {
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			if err := cleanupDrafts(); err != nil {
				log.Printf("Error cleaning up drafts: %v", err)
			}
			if err := cleanupExpiredTokens(); err != nil {
				log.Printf("Error cleaning up expired tokens: %v", err)
			}
			if err := checkpointWAL(); err != nil {
				log.Printf("Error checkpointing WAL: %v", err)
			}
		}
	}()
}

func cleanupDrafts() error {
	db := database.GetDB()
	// Delete drafts created more than 1 hour ago
	cutoff := time.Now().UTC().Add(-1 * time.Hour)
	result, err := db.Exec(`DELETE FROM lotteries WHERE status = 'draft' AND created_at < ?`, cutoff)
	if err != nil {
		return err
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("Cleaned up %d stale draft lotteries", rowsAffected)
	}
	return nil
}

func cleanupExpiredTokens() error {
	db := database.GetDB()
	// Delete tokens that have expired
	result, err := db.Exec(`DELETE FROM edit_tokens WHERE expires_at < ?`, time.Now().UTC())
	if err != nil {
		return err
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("Cleaned up %d expired edit tokens", rowsAffected)
	}
	return nil
}

func checkpointWAL() error {
	db := database.GetDB()
	_, err := db.Exec(`PRAGMA wal_checkpoint(TRUNCATE)`)
	return err
}
