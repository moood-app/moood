package main

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/go-playground/validator/v10"
)

type EntryEvent struct {
	Id        string         `json:"id" validate:"required,uuid"`
	Entry     string         `json:"entry" validate:"required"`
	CreatedAt string         `json:"createdAt" validate:"required"`
	Metadata  map[string]any `json:"metadata" validate:"required, min=1"`
}

func HandleRequest(ctx context.Context, events map[int]*EntryEvent) (*string, error) {
	if len(events) == 0 {
		return nil, fmt.Errorf("received empty event")
	}

	for i, event := range events {
		validate := validator.New(validator.WithRequiredStructEnabled())
		err := validate.Struct(event)
		if err != nil {
			fmt.Printf("Event %s was skipped because validation failed: %v\n", event.Id, err)
			delete(events, i)
			continue
		}
	}

	message := fmt.Sprintf("%d events were processed", len(events))
	return &message, nil
}

func main() {
	lambda.Start(HandleRequest)
}
