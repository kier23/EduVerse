import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/layouts/app-shell";
import {
  createEvent,
  deleteEvent,
  fetchCalendarEvents,
  type EventItem,
} from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";
import { Clock, Trash2, CalendarDays, X } from "lucide-react";

const EVENT_COLORS: Record<string, string> = {
  general: "bg-indigo-500",
  exam: "bg-red-500",
  meeting: "bg-amber-500",
  deadline: "bg-emerald-500",
  activity: "bg-sky-500",
};

const EVENT_TEXT_COLORS: Record<string, string> = {
  general: "text-indigo-700",
  exam: "text-red-700",
  meeting: "text-amber-700",
  deadline: "text-emerald-700",
  activity: "text-sky-700",
};

const EVENT_BG_LIGHT: Record<string, string> = {
  general: "bg-indigo-50",
  exam: "bg-red-50",
  meeting: "bg-amber-50",
  deadline: "bg-emerald-50",
  activity: "bg-sky-50",
};

function getEventColor(eventType: string | null) {
  return EVENT_COLORS[eventType ?? "general"] ?? EVENT_COLORS.general;
}
function getEventTextColor(eventType: string | null) {
  return EVENT_TEXT_COLORS[eventType ?? "general"] ?? EVENT_TEXT_COLORS.general;
}
function getEventBgLight(eventType: string | null) {
  return EVENT_BG_LIGHT[eventType ?? "general"] ?? EVENT_BG_LIGHT.general;
}

export function TeacherCalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [month, setMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("general");
  // Multi-date selection for the add event form
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const loadEvents = useCallback(() => {
    if (!user) return;
    fetchCalendarEvents(user.id).then(setEvents);
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Map dates to events for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const evt of events) {
      if (!evt.start_date) continue;
      const key = format(parseISO(evt.start_date), "yyyy-MM-dd");
      const existing = map.get(key) ?? [];
      existing.push(evt);
      map.set(key, existing);
    }
    return map;
  }, [events]);

  // Events on the selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return eventsByDate.get(key) ?? [];
  }, [selectedDate, eventsByDate]);

  // Toggle a date in the multi-select for the form
  const toggleFormDate = (date: Date) => {
    setSelectedDates((prev) => {
      const exists = prev.some((d) => isSameDay(d, date));
      if (exists) return prev.filter((d) => !isSameDay(d, date));
      return [...prev, date];
    });
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventType("general");
    setSelectedDates([]);
    setStartTime("09:00");
    setEndTime("10:00");
    setShowForm(false);
  };

  const onAddEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || selectedDates.length === 0) return;

    // Create one event per selected date
    await Promise.all(
      selectedDates.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        // Build a local datetime string (no UTC conversion) so "12:00 AM"
        // is stored as 00:00 in the DB, not shifted to UTC offset.
        const startLocal = `${dateStr} ${startTime}:00`;
        const endLocal = `${dateStr} ${endTime}:00`;
        return createEvent({
          created_by: user.id,
          subject_id: null,
          title,
          description: description || "Calendar event",
          start_date: startLocal,
          end_date: endLocal,
          event_type: eventType,
        });
      }),
    );

    resetForm();
    loadEvents();
  };

  const onDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId);
    loadEvents();
  };

  return (
    <AppShell title="Calendar / Schedule">
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ── Calendar ── */}
        <Card>
          <div className="h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={month}
              onMonthChange={setMonth}
              className="w-full rounded-xl bg-white p-3"
              classNames={{
                months: "w-full",
                month: "w-full",
                month_grid: "w-full border-collapse",
                weekdays: "w-full flex",
                weekday:
                  "flex-1 text-center text-muted-foreground font-normal text-[0.8rem]",
                week: "w-full flex",
                day: "flex-1 p-0.5",
                day_button: "w-full h-full p-0",
              }}
              components={{
                Day: ({ day }) => {
                  const dateKey = format(day.date, "yyyy-MM-dd");
                  const dayEvents = eventsByDate.get(dateKey) ?? [];
                  const isSelected =
                    selectedDate && isSameDay(day.date, selectedDate);

                  return (
                    <button
                      onClick={() => setSelectedDate(day.date)}
                      className={`relative flex h-auto min-h-[4.5rem] w-full min-w-0 flex-col items-start overflow-hidden rounded-lg border p-1 text-left transition hover:bg-slate-50 ${
                        isSelected
                          ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400"
                          : "border-transparent"
                      }`}
                    >
                      {/* Day number */}
                      <span
                        className={`mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          isSelected
                            ? "bg-indigo-500 text-white"
                            : "text-slate-700"
                        }`}
                      >
                        {format(day.date, "d")}
                      </span>

                      {/* Event chips — show up to 2, then "+N more" */}
                      <div className="flex w-full min-w-0 flex-col gap-0.5 overflow-hidden">
                        {dayEvents.slice(0, 2).map((evt, i) => (
                          <span
                            key={i}
                            className={`block w-full truncate rounded px-1 py-px text-[10px] font-medium leading-tight ${getEventBgLight(evt.event_type)} ${getEventTextColor(evt.event_type)}`}
                          >
                            {evt.title}
                          </span>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                },
              }}
            />
          </CardContent>
        </Card>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Selected Day Header */}
          <Card>
            <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {selectedDate
                    ? format(selectedDate, "EEEE, MMMM d, yyyy")
                    : "Select a date"}
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowForm(!showForm);
                    if (!showForm && selectedDate) {
                      // Pre-select the currently viewed date
                      setSelectedDates([selectedDate]);
                    }
                  }}
                  className="h-8 bg-indigo-500 hover:bg-indigo-600 text-white text-xs"
                >
                  {showForm ? "Cancel" : "+ Add Event"}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* ── Add Event Form with Calendar Picker ── */}
          {showForm && (
            <Card className="animate-in slide-in-from-top-2 duration-200">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-sky-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base">New Event</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={onAddEvent}>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Event title"
                    required
                  />
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                  />

                  {/* Multi-date calendar picker */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                      Select date(s) — click to toggle
                    </label>
                    <div className="rounded-lg border bg-white p-1">
                      <Calendar
                        mode="multiple"
                        selected={selectedDates}
                        onSelect={(dates) => setSelectedDates(dates ?? [])}
                        className="rounded-md"
                      />
                    </div>

                    {/* Selected date chips */}
                    {selectedDates.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedDates
                          .sort((a, b) => a.getTime() - b.getTime())
                          .map((d, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
                            >
                              {format(d, "MMM d")}
                              <button
                                type="button"
                                onClick={() => toggleFormDate(d)}
                                className="rounded-full hover:bg-indigo-200"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Time range */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Start time
                      </label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        End time
                      </label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Event type */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Type
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="general">General</option>
                      <option value="exam">Exam</option>
                      <option value="meeting">Meeting</option>
                      <option value="deadline">Deadline</option>
                      <option value="activity">Activity</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={selectedDates.length === 0 || !title}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50"
                  >
                    {selectedDates.length > 1
                      ? `Add Event to ${selectedDates.length} dates`
                      : "Add Event"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Events for selected day ── */}
          <Card>
            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 rounded-full bg-slate-100 p-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No events scheduled for this day.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-indigo-500 text-xs"
                    onClick={() => {
                      setShowForm(true);
                      if (selectedDate) setSelectedDates([selectedDate]);
                    }}
                  >
                    + Add one
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents
                    .sort((a, b) => {
                      const aDate = a.start_date
                        ? parseISO(a.start_date).getTime()
                        : 0;
                      const bDate = b.start_date
                        ? parseISO(b.start_date).getTime()
                        : 0;
                      return aDate - bDate;
                    })
                    .map((evt) => (
                      <div
                        key={evt.id}
                        className="group relative rounded-xl border bg-white/60 p-3 backdrop-blur-sm transition hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${getEventColor(evt.event_type)}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm leading-tight">
                              {evt.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              <Clock className="mr-1 inline h-3 w-3" />
                              {evt.start_date
                                ? format(parseISO(evt.start_date), "h:mm a")
                                : "—"}
                              {" – "}
                              {evt.end_date
                                ? format(parseISO(evt.end_date), "h:mm a")
                                : "—"}
                            </p>
                            {evt.description && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {evt.description}
                              </p>
                            )}
                            {evt.event_type && (
                              <Badge
                                variant="secondary"
                                className="mt-2 capitalize text-[0.65rem]"
                              >
                                {evt.event_type}
                              </Badge>
                            )}
                          </div>
                          <button
                            onClick={() => onDeleteEvent(evt.id)}
                            className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                            aria-label="Delete event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
