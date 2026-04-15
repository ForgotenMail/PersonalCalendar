const state = {
  view: "month",
  currentDate: new Date(),
  events: [],
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const el = {
  calendar: document.getElementById("calendar"),
  currentLabel: document.getElementById("currentLabel"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  todayBtn: document.getElementById("todayBtn"),
  addEventBtn: document.getElementById("addEventBtn"),
  viewButtons: [...document.querySelectorAll(".view-btn")],
  dialog: document.getElementById("eventDialog"),
  form: document.getElementById("eventForm"),
};

const localFallback = {
  async ListEvents() {
    const raw = localStorage.getItem("calendar-events");
    return raw ? JSON.parse(raw) : [];
  },
  async CreateEvent(input) {
    const current = await this.ListEvents();
    const event = {
      ...input,
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      start: input.start,
      end: input.end,
    };
    current.push(event);
    localStorage.setItem("calendar-events", JSON.stringify(current));
    return event;
  },
};

const backend = window.go?.main?.App ?? localFallback;

function toDate(raw) {
  return raw instanceof Date ? raw : new Date(raw);
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function formatLabel() {
  const d = state.currentDate;

  if (state.view === "month") {
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  if (state.view === "week") {
    const start = startOfWeek(d);
    const end = addDays(start, 6);
    return `${start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function eventsForDay(day) {
  return state.events
    .filter((e) => sameDay(toDate(e.start), day))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

function renderMonth() {
  const base = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
  const gridStart = startOfWeek(base);

  const wrappers = [`<div class="month-grid">${weekdays.map((d) => `<div class="weekday">${d}</div>`).join("")}`];

  for (let i = 0; i < 42; i += 1) {
    const day = addDays(gridStart, i);
    const dayEvents = eventsForDay(day);

    wrappers.push(`<div class="day-cell">
        <div class="day-number ${day.getMonth() === state.currentDate.getMonth() ? "current" : ""}">${day.getDate()}</div>
        ${dayEvents
          .map(
            (e) => `<div class="event-pill" title="${e.title}" style="background:${e.color || "#3b82f6"}">
              ${new Date(e.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${e.title}
            </div>`,
          )
          .join("")}
      </div>`);
  }

  wrappers.push("</div>");
  el.calendar.innerHTML = wrappers.join("");
}

function renderAgenda(days) {
  el.calendar.innerHTML = `<div class="agenda">
      ${days
        .map((day) => {
          const events = eventsForDay(day);
          return `<article class="agenda-day">
            <h3>${day.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}</h3>
            ${
              events.length
                ? events
                    .map(
                      (e) => `<div class="agenda-event" style="border-left-color:${e.color || "#3b82f6"}">
                            <strong>${e.title}</strong>
                            <div class="agenda-meta">${new Date(e.start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} - ${new Date(e.end).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}${e.location ? ` · ${e.location}` : ""}</div>
                            ${e.description ? `<div>${e.description}</div>` : ""}
                          </div>`,
                    )
                    .join("")
                : `<div class="agenda-meta">No events</div>`
            }
          </article>`;
        })
        .join("")}
    </div>`;
}

function renderWeek() {
  const start = startOfWeek(state.currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  renderAgenda(days);
}

function renderDay() {
  renderAgenda([new Date(state.currentDate)]);
}

function render() {
  el.currentLabel.textContent = formatLabel();
  el.viewButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));

  if (state.view === "month") {
    renderMonth();
  } else if (state.view === "week") {
    renderWeek();
  } else {
    renderDay();
  }
}

async function loadEvents() {
  const events = await backend.ListEvents();
  state.events = events.map((e) => ({
    ...e,
    title: e.title || e.Title,
    description: e.description || e.Description,
    location: e.location || e.Location,
    color: e.color || e.Color,
    start: e.start || e.Start,
    end: e.end || e.End,
    allDay: e.allDay ?? e.AllDay,
    id: e.id || e.ID,
  }));
}

function shiftCurrent(amount) {
  if (state.view === "month") {
    state.currentDate.setMonth(state.currentDate.getMonth() + amount);
  } else if (state.view === "week") {
    state.currentDate.setDate(state.currentDate.getDate() + amount * 7);
  } else {
    state.currentDate.setDate(state.currentDate.getDate() + amount);
  }
}

function toRFC3339(localDateTime) {
  return new Date(localDateTime).toISOString();
}

function openAddDialog() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  el.form.reset();
  el.form.start.value = start.toISOString().slice(0, 16);
  el.form.end.value = end.toISOString().slice(0, 16);
  el.dialog.showModal();
}

function wireEvents() {
  el.prevBtn.addEventListener("click", async () => {
    shiftCurrent(-1);
    render();
  });

  el.nextBtn.addEventListener("click", async () => {
    shiftCurrent(1);
    render();
  });

  el.todayBtn.addEventListener("click", () => {
    state.currentDate = new Date();
    render();
  });

  el.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    });
  });

  el.addEventBtn.addEventListener("click", openAddDialog);

  el.form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(el.form);
    const payload = {
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      location: String(formData.get("location") || "").trim(),
      start: toRFC3339(String(formData.get("start"))),
      end: toRFC3339(String(formData.get("end"))),
      color: String(formData.get("color") || "#3b82f6"),
      allDay: Boolean(formData.get("allDay")),
    };

    await backend.CreateEvent(payload);
    await loadEvents();
    render();
    el.dialog.close();
  });
}

async function init() {
  wireEvents();
  await loadEvents();
  render();
}

init();
