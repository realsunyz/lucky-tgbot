package api

import "github.com/gofiber/fiber/v3"

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

const (
	ERR_UNAUTHORIZED       = "ERR_UNAUTHORIZED"
	ERR_NOT_FOUND          = "ERR_NOT_FOUND"
	ERR_BAD_REQUEST        = "ERR_BAD_REQUEST"
	ERR_CONFLICT           = "ERR_CONFLICT"
	ERR_INTERNAL           = "ERR_INTERNAL"
	ERR_LOTTERY_FULL       = "ERR_LOTTERY_FULL"
	ERR_LOTTERY_ENDED      = "ERR_LOTTERY_ENDED"
	ERR_LOTTERY_NOT_ACTIVE = "ERR_LOTTERY_NOT_ACTIVE"
	ERR_TOKEN_INVALID      = "ERR_TOKEN_INVALID"
	ERR_RATE_LIMITED       = "ERR_RATE_LIMITED"
	ERR_REQUEST_TIMEOUT    = "ERR_REQUEST_TIMEOUT"
)

func SendError(c fiber.Ctx, status int, code string, message string) error {
	return c.Status(status).JSON(ErrorResponse{
		Code:    code,
		Message: message,
	})
}

func SendInternalError(c fiber.Ctx) error {
	return SendError(c, fiber.StatusInternalServerError, ERR_INTERNAL, "Internal server error")
}
