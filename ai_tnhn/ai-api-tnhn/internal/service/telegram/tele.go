package telegram

import (
	"fmt"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

type BotTele interface {
	SendMessage(channelID int64, text string) error
	SendPhoto(chatID int64, url string, text string) error
	GetAdmins(chatID int64) (map[int64]bool, error)
	GetBroker() *tgbotapi.BotAPI
}

type botTele struct {
	*tgbotapi.BotAPI
}

func NewBot(token string) (BotTele, error) {
	bot, err := tgbotapi.NewBotAPI(token)
	if err != nil {
		return nil, err
	}

	bot.Debug = true
	return botTele{bot}, nil
}

func (b botTele) GetBroker() *tgbotapi.BotAPI {
	return b.BotAPI
}

func (b botTele) SendMessage(channelID int64, text string) error {
	fmt.Println("SEND TELEGRAM")
	msg := tgbotapi.NewMessage(channelID, text)
	_, err := b.Send(msg)
	return err
}

func (b botTele) SendPhoto(chatID int64, url string, text string) error {
	// Create a new InputMediaPhoto object
	photo := tgbotapi.NewInputMediaPhoto(tgbotapi.FilePath(url))
	photo.Caption = text

	// Send the photo
	mediaGroup := tgbotapi.NewMediaGroup(chatID, []interface{}{photo})
	if _, err := b.Send(mediaGroup); err != nil {
		return err
	}
	return nil
}

func (b botTele) GetAdmins(chatID int64) (map[int64]bool, error) {
	admins, err := b.GetChatAdministrators(tgbotapi.ChatAdministratorsConfig{ChatConfig: tgbotapi.ChatConfig{
		ChatID: chatID,
	}})
	if err != nil {
		return nil, err
	}

	// Store admin IDs to easily check against the sender ID
	adminIDs := make(map[int64]bool)
	for _, admin := range admins {
		adminIDs[admin.User.ID] = true
	}
	return adminIDs, nil
}
