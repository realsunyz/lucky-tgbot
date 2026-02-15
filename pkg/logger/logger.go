package logger

import (
	"fmt"
	"log"
	"os"
	"time"
)

var (
	stdout = log.New(os.Stdout, "", 0)
	stderr = log.New(os.Stderr, "", 0)
)

func Infof(format string, args ...any) {
	logf(stdout, "INFO", format, args...)
}

func Warnf(format string, args ...any) {
	logf(stdout, "WARN", format, args...)
}

func Errorf(format string, args ...any) {
	logf(stderr, "ERROR", format, args...)
}

func Fatalf(format string, args ...any) {
	logf(stderr, "FATAL", format, args...)
	os.Exit(1)
}

func logf(l *log.Logger, level, format string, args ...any) {
	ts := time.Now().Format(time.RFC3339)
	msg := fmt.Sprintf(format, args...)
	l.Printf("%s [%s] %s", ts, level, msg)
}
