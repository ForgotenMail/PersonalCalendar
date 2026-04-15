# Personal Calendar (Go + Wails)

A lightweight Google-Calendar-style desktop app built with **Go** and **Wails**.

## What it includes

- Month, week, and day calendar views.
- Light, clean UI.
- Event creation with title, date/time range, location, description, and **any color**.
- In-memory Go backend with event CRUD methods exposed to the UI.

## Run locally

1. Install Wails CLI (if needed):
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```
2. In the project folder, run:
   ```bash
   go mod tidy
   wails dev
   ```

## Backend API

The Wails-bound Go backend exposes:

- `ListEvents() []Event`
- `CreateEvent(input EventInput) (Event, error)`
- `UpdateEvent(id string, input EventInput) (Event, error)`
- `DeleteEvent(id string) error`
