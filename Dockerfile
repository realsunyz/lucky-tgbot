# Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
RUN npm install -g pnpm
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ .
RUN pnpm build

# Build Backend
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /lucky-tgbot .

# Final Stage
FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend-builder /lucky-tgbot .
COPY --from=frontend-builder /app/web/dist ./web/dist

CMD ["./lucky-tgbot"]
