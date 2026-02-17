package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/realSunyz/lucky-tgbot/pkg/logger"
	_ "modernc.org/sqlite"
)

var (
	db   *sql.DB
	once sync.Once
)

func GetDB() *sql.DB {
	once.Do(func() {
		dbPath := os.Getenv("DATABASE_PATH")
		if dbPath == "" {
			dbPath = "lottery.db"
		}

		// Ensure directory exists
		dir := filepath.Dir(dbPath)
		if dir != "" && dir != "." {
			if err := os.MkdirAll(dir, 0755); err != nil {
				logger.Fatalf("failed to create database directory: %v", err)
			}
		}

		var err error
		db, err = sql.Open("sqlite", dbPath)
		if err != nil {
			logger.Fatalf("failed to open database: %v", err)
		}

		// SQLite performs best with a single shared connection in this app.
		db.SetMaxOpenConns(1)
		db.SetMaxIdleConns(1)

		// Enable WAL mode for better concurrent performance
		if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
			logger.Warnf("failed to enable WAL mode: %v", err)
		}
		if _, err := db.Exec("PRAGMA foreign_keys=ON"); err != nil {
			logger.Warnf("failed to enable foreign key constraints: %v", err)
		}
		if _, err := db.Exec("PRAGMA busy_timeout=5000"); err != nil {
			logger.Warnf("failed to set busy timeout: %v", err)
		}
		if _, err := db.Exec("PRAGMA synchronous=NORMAL"); err != nil {
			logger.Warnf("failed to set synchronous mode: %v", err)
		}

		// Initialize schema
		if err := initSchema(); err != nil {
			logger.Fatalf("failed to initialize database schema: %v", err)
		}

		logger.Infof("database initialized successfully")
	})
	return db
}

func initSchema() error {
	schema := `
	-- Lotteries table
	CREATE TABLE IF NOT EXISTS lotteries (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		description TEXT,
		creator_id INTEGER NOT NULL,
		draw_mode TEXT NOT NULL CHECK(draw_mode IN ('timed', 'full', 'manual')),
		draw_time DATETIME,
		draw_time DATETIME,
		max_entries INTEGER,
		status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'completed')),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		is_weights_disabled INTEGER DEFAULT 0
	);

	-- Prizes table
	CREATE TABLE IF NOT EXISTS prizes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		lottery_id TEXT NOT NULL,
		name TEXT NOT NULL,
		quantity INTEGER NOT NULL DEFAULT 1,
		FOREIGN KEY (lottery_id) REFERENCES lotteries(id) ON DELETE CASCADE
	);

	-- Participants table
	CREATE TABLE IF NOT EXISTS participants (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		lottery_id TEXT NOT NULL,
		user_id INTEGER NOT NULL,
		username TEXT,
		first_name TEXT,
		last_name TEXT,
		weight INTEGER NOT NULL DEFAULT 1,
		joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (lottery_id) REFERENCES lotteries(id) ON DELETE CASCADE,
		UNIQUE(lottery_id, user_id)
	);

	-- Edit tokens table
	CREATE TABLE IF NOT EXISTS edit_tokens (
		token TEXT PRIMARY KEY,
		lottery_id TEXT NOT NULL,
		expires_at DATETIME NOT NULL,
		FOREIGN KEY (lottery_id) REFERENCES lotteries(id) ON DELETE CASCADE
	);

	-- Winners table
	CREATE TABLE IF NOT EXISTS winners (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		lottery_id TEXT NOT NULL,
		participant_id INTEGER NOT NULL,
		prize_id INTEGER NOT NULL,
		user_id INTEGER NOT NULL,
		username TEXT,
		prize_name TEXT NOT NULL,
		FOREIGN KEY (lottery_id) REFERENCES lotteries(id) ON DELETE CASCADE,
		FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
		FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE CASCADE
	);

	-- Prize weights table
	CREATE TABLE IF NOT EXISTS prize_weights (
		lottery_id TEXT NOT NULL,
		user_id INTEGER NOT NULL,
		prize_id INTEGER NOT NULL,
		weight INTEGER NOT NULL,
		PRIMARY KEY (lottery_id, user_id, prize_id),
		FOREIGN KEY (lottery_id) REFERENCES lotteries(id) ON DELETE CASCADE,
		FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE CASCADE
	);

	-- Indexes for better query performance
	CREATE INDEX IF NOT EXISTS idx_prizes_lottery ON prizes(lottery_id);
	CREATE INDEX IF NOT EXISTS idx_participants_lottery ON participants(lottery_id);
	CREATE INDEX IF NOT EXISTS idx_participants_lottery_joined ON participants(lottery_id, joined_at);
	CREATE INDEX IF NOT EXISTS idx_edit_tokens_lottery ON edit_tokens(lottery_id);
	CREATE INDEX IF NOT EXISTS idx_edit_tokens_expires ON edit_tokens(expires_at);
	CREATE INDEX IF NOT EXISTS idx_winners_lottery ON winners(lottery_id);
	CREATE INDEX IF NOT EXISTS idx_lotteries_timed_due ON lotteries(status, draw_mode, draw_time);
	CREATE INDEX IF NOT EXISTS idx_lotteries_draft_created ON lotteries(status, created_at);
	`

	_, err := db.Exec(schema)
	if err != nil {
		return fmt.Errorf("failed to execute schema: %w", err)
	}

	// Manual migration for is_weights_disabled
	_, err = db.Exec(`ALTER TABLE lotteries ADD COLUMN is_weights_disabled INTEGER DEFAULT 0;`)
	if err != nil {
		// Ignore error if column already exists
		logger.Infof("Migration is_weights_disabled: %v (safe to ignore if column exists)", err)
	}

	return nil
}

func Close() error {
	if db != nil {
		return db.Close()
	}
	return nil
}
