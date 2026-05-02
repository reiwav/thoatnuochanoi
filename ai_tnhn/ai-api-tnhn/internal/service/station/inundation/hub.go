package inundation

import (
	"sync"
)

// PointChangeInfo contains the point metadata used for targeted filtering
type PointChangeInfo struct {
	PointID      string
	OrgID        string
	SharedOrgIDs []string
	ShareAll     bool
}

// Subscriber represents a connected SSE client with permission context
type Subscriber struct {
	UserID      string
	OrgID       string
	Role        string
	IsCompany   bool
	IsEmployee  bool
	AssignedIDs []string // assigned_inundation_station_ids
	Ch          chan string
}

// Hub manages SSE subscribers and targeted event broadcasting
type Hub struct {
	subscribers map[string]*Subscriber // userID → Subscriber
	mu          sync.RWMutex
}

// NewHub creates a new SSE Hub
func NewHub() *Hub {
	return &Hub{
		subscribers: make(map[string]*Subscriber),
	}
}

// Subscribe registers a new SSE client. Returns the event channel to listen on.
func (h *Hub) Subscribe(sub *Subscriber) chan string {
	h.mu.Lock()
	defer h.mu.Unlock()

	// If user already has a connection, close the old one
	if existing, ok := h.subscribers[sub.UserID]; ok {
		close(existing.Ch)
		delete(h.subscribers, sub.UserID)
	}

	sub.Ch = make(chan string, 8) // buffered to avoid blocking
	h.subscribers[sub.UserID] = sub
	return sub.Ch
}

// Unsubscribe removes a subscriber by userID
func (h *Hub) Unsubscribe(userID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if sub, ok := h.subscribers[userID]; ok {
		close(sub.Ch)
		delete(h.subscribers, userID)
		_ = sub // prevent unused warning
	}
}

// NotifyPointChange sends a targeted event to subscribers who are related to the changed point
func (h *Hub) NotifyPointChange(info PointChangeInfo) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, sub := range h.subscribers {
		if shouldNotify(sub, info) {
			select {
			case sub.Ch <- "points_updated":
			default:
				// Channel full, skip (client is slow)
			}
		}
	}
}

// shouldNotify determines if a subscriber should receive the event
func shouldNotify(sub *Subscriber, info PointChangeInfo) bool {
	// Company users and super admins always receive all events
	if sub.IsCompany || sub.Role == "super_admin" {
		return true
	}

	// Manager/Employee: check org match
	if sub.OrgID != "" && sub.OrgID == info.OrgID {
		return true
	}

	// Check shared orgs
	for _, sharedOrgID := range info.SharedOrgIDs {
		if sharedOrgID == sub.OrgID {
			return true
		}
	}

	// Share all points
	if info.ShareAll {
		return true
	}

	// Employee: check assigned station IDs
	if sub.IsEmployee {
		for _, assignedID := range sub.AssignedIDs {
			if assignedID == info.PointID {
				return true
			}
		}
	}

	return false
}
