package main

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type Event struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Location    string    `json:"location"`
	Start       time.Time `json:"start"`
	End         time.Time `json:"end"`
	Color       string    `json:"color"`
	AllDay      bool      `json:"allDay"`
}

type EventInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Location    string `json:"location"`
	Start       string `json:"start"`
	End         string `json:"end"`
	Color       string `json:"color"`
	AllDay      bool   `json:"allDay"`
}

type App struct {
	ctx    context.Context
	mu     sync.RWMutex
	events map[string]Event
}

var idCounter uint64

func NewApp() *App {
	app := &App{events: make(map[string]Event)}
	app.seed()
	return app
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) ListEvents() []Event {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result := make([]Event, 0, len(a.events))
	for _, event := range a.events {
		result = append(result, event)
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Start.Equal(result[j].Start) {
			return result[i].Title < result[j].Title
		}
		return result[i].Start.Before(result[j].Start)
	})

	return result
}

func (a *App) CreateEvent(input EventInput) (Event, error) {
	event, err := normalizeEvent("", input)
	if err != nil {
		return Event{}, err
	}
	event.ID = newID()

	a.mu.Lock()
	defer a.mu.Unlock()
	a.events[event.ID] = event

	return event, nil
}

func (a *App) UpdateEvent(id string, input EventInput) (Event, error) {
	if strings.TrimSpace(id) == "" {
		return Event{}, errors.New("event id is required")
	}

	event, err := normalizeEvent(id, input)
	if err != nil {
		return Event{}, err
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	if _, exists := a.events[id]; !exists {
		return Event{}, fmt.Errorf("event %s not found", id)
	}

	a.events[id] = event
	return event, nil
}

func (a *App) DeleteEvent(id string) error {
	if strings.TrimSpace(id) == "" {
		return errors.New("event id is required")
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	if _, exists := a.events[id]; !exists {
		return fmt.Errorf("event %s not found", id)
	}

	delete(a.events, id)
	return nil
}

func normalizeEvent(id string, input EventInput) (Event, error) {
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return Event{}, errors.New("title is required")
	}

	start, err := parseRFC3339(input.Start)
	if err != nil {
		return Event{}, fmt.Errorf("invalid start time: %w", err)
	}

	end, err := parseRFC3339(input.End)
	if err != nil {
		return Event{}, fmt.Errorf("invalid end time: %w", err)
	}

	if !end.After(start) {
		return Event{}, errors.New("end time must be after start time")
	}

	color := strings.TrimSpace(input.Color)
	if color == "" {
		color = "#3b82f6"
	}

	return Event{
		ID:          id,
		Title:       title,
		Description: strings.TrimSpace(input.Description),
		Location:    strings.TrimSpace(input.Location),
		Start:       start,
		End:         end,
		Color:       color,
		AllDay:      input.AllDay,
	}, nil
}

func parseRFC3339(raw string) (time.Time, error) {
	return time.Parse(time.RFC3339, strings.TrimSpace(raw))
}

func newID() string {
	next := atomic.AddUint64(&idCounter, 1)
	return fmt.Sprintf("evt-%d-%d", time.Now().UnixNano(), next)
}

func (a *App) seed() {
	now := time.Now().UTC().Truncate(time.Minute)
	events := []EventInput{
		{
			Title:       "Design Review",
			Description: "Discuss onboarding flow updates.",
			Location:    "Room A / Meet",
			Start:       now.Add(2 * time.Hour).Format(time.RFC3339),
			End:         now.Add(3 * time.Hour).Format(time.RFC3339),
			Color:       "#2563eb",
		},
		{
			Title:       "Workout",
			Description: "Strength + cardio",
			Location:    "Gym",
			Start:       now.Add(24 * time.Hour).Format(time.RFC3339),
			End:         now.Add(25 * time.Hour).Format(time.RFC3339),
			Color:       "#16a34a",
		},
		{
			Title:       "Date Night",
			Description: "Dinner reservation.",
			Location:    "Downtown",
			Start:       now.Add(48 * time.Hour).Format(time.RFC3339),
			End:         now.Add(50 * time.Hour).Format(time.RFC3339),
			Color:       "#db2777",
		},
	}

	for _, e := range events {
		created, err := normalizeEvent(newID(), e)
		if err != nil {
			continue
		}
		a.events[created.ID] = created
	}
}
