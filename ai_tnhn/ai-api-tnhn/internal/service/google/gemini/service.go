package gemini

import (
	"ai-api-tnhn/internal/repository"
	"ai-api-tnhn/internal/service/contract"
	"ai-api-tnhn/internal/service/station/emergency_construction"
	"ai-api-tnhn/internal/service/google/googleapi"
	"ai-api-tnhn/internal/service/station/inundation"
	pumpingstation "ai-api-tnhn/internal/service/station/pumping_station"
	"ai-api-tnhn/internal/service/query"
	"ai-api-tnhn/internal/service/station"
	"ai-api-tnhn/internal/service/station/stationdata"
	"ai-api-tnhn/internal/service/station/water"
	"context"
	"fmt"
	"strings"
	"sync"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type Service interface {
	Chat(ctx context.Context, prompt string, history []googleapi.ChatMessage, userID string, isCompany bool, logPrompt string) (string, error)
	ChatContract(ctx context.Context, prompt string, history []googleapi.ChatMessage, userID string, isCompany bool, logPrompt string) (string, error)
	ExtractTextFromPDF(ctx context.Context, pdfBytes []byte) (string, error)
}

type service struct {
	clients               []*genai.Client
	contractClients       []*genai.Client
	mu                    sync.Mutex
	roundRobinIdx         int
	contractRoundRobinIdx int
	waterSvc              water.Service
	googleApiSvc          googleapi.Service
	inuSvc                inundation.Service
	querySvc              query.Service
	stationDataSvc        stationdata.Service
	emcSvc                emergency_construction.Service
	contractSvc           contract.Service
	stationSvc            station.Service
	pumpingSvc            pumpingstation.Service
	aiUsageRepo           repository.AiUsage
	aiChatLogRepo         repository.AiChatLog
	userRepo              repository.User
}

func NewService(k, kc string, w water.Service, g googleapi.Service, i inundation.Service, q query.Service, sd stationdata.Service, e emergency_construction.Service, c contract.Service, s station.Service, p pumpingstation.Service, ar repository.AiUsage, al repository.AiChatLog, ur repository.User) (Service, error) {
	if k == "" {
		return nil, fmt.Errorf("gemini api key is required")
	}
	ctx := context.Background()
	var cl, ccl []*genai.Client
	for _, key := range strings.Split(k, ",") {
		if key = strings.TrimSpace(key); key != "" {
			if client, err := genai.NewClient(ctx, option.WithAPIKey(key)); err == nil {
				cl = append(cl, client)
			}
		}
	}
	if kc == "" {
		ccl = cl
	} else {
		for _, key := range strings.Split(kc, ",") {
			if key = strings.TrimSpace(key); key != "" {
				if client, err := genai.NewClient(ctx, option.WithAPIKey(key)); err == nil {
					ccl = append(ccl, client)
				}
			}
		}
	}
	if len(cl) == 0 {
		return nil, fmt.Errorf("failed to create any valid gemini client")
	}
	return &service{clients: cl, contractClients: ccl, waterSvc: w, googleApiSvc: g, inuSvc: i, querySvc: q, stationDataSvc: sd, emcSvc: e, contractSvc: c, stationSvc: s, pumpingSvc: p, aiUsageRepo: ar, aiChatLogRepo: al, userRepo: ur}, nil
}
