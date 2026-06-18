// pages/student/calendar-page.tsx
// Student calendar — monthly view with event creation and deletion.

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Loader2,
  AlertCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { AppShell } from "@/layouts/app-shell";
import {
  fetchCalendarEvents,
  createEvent,
  deleteEvent,
  type EventItem,
} from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const EVENT_COLORS: Record<string, { bg: string; text: string; dot: string }> =
  {
    personal: {
      bg: "bg-indigo-100",
      text: "text-amber-700",
      dot: "bg-amber-400/100",
    },
    academic: {
      bg: "bg-violet-100",
      text: "text-violet-700",
      dot: "bg-violet-400/100",
    },
    reminder: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    deadline: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
    other: { bg: "bg-slate-100", text: "text-slate-300", dot: "bg-slate-400" },
  };

function colorFor(type: string | null) {
  return EVENT_COLORS[type ?? "other"] ?? EVENT_COLORS.other;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentCalendarPage() {
  const { user } = useAuth();

  const today = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected day
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    event_type: "personal",
  });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCalendarEvents(user.id)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [user]);

  // ── Calendar grid ─────────────────────────────────────────────────────────

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(year, month, i + 1),
    ),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const eventsOnDay = (day: Date) =>
    events.filter((e) => {
      if (!e.start_date) return false;
      return isSameDay(new Date(e.start_date), day);
    });

  const selectedEvents = selectedDay ? eventsOnDay(selectedDay) : [];

  // ── Create ────────────────────────────────────────────────────────────────

  const openCreate = (day?: Date) => {
    const dateStr = day
      ? `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
      : "";
    setForm({
      title: "",
      description: "",
      start_date: dateStr,
      end_date: dateStr,
      event_type: "personal",
    });
    setCreateError("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!user || !form.title.trim() || !form.start_date) return;
    setCreating(true);
    setCreateError("");
    try {
      await createEvent({
        created_by: user.id,
        subject_id: null,
        title: form.title.trim(),
        description: form.description.trim(),
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        event_type: form.event_type,
      });
      const updated = await fetchCalendarEvents(user.id);
      setEvents(updated);
      setCreateOpen(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create event.",
      );
    } finally {
      setCreating(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEvent(deleteTarget.id);
      setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell title="My Calendar">
      <div className="flex flex-col gap-5 xl:flex-row">
        {/* ── Calendar panel ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 shadow-lg backdrop-blur-md overflow-hidden">
            {/* Month header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  {MONTHS[month]} {year}
                </p>
              </div>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((day, idx) => {
                  if (!day)
                    return (
                      <div
                        key={idx}
                        className="min-h-16 border-b border-r border-slate-50"
                      />
                    );

                  const dayEvents = eventsOnDay(day);
                  const isToday = isSameDay(day, today);
                  const isSelected = selectedDay
                    ? isSameDay(day, selectedDay)
                    : false;
                  const isOtherMonth = day.getMonth() !== month;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "group min-h-16 flex flex-col p-1.5 border-b border-r border-slate-50 text-left transition-all",
                        isSelected ? "bg-amber-400/10" : "hover:bg-slate-950/70",
                        isOtherMonth && "opacity-30",
                      )}
                    >
                      <span
                        className={cn(
                          "mb-1 flex h-6 w-6 items-center justify-center self-end rounded-full text-xs font-medium transition-all",
                          isToday
                            ? "bg-amber-400/100 text-white"
                            : isSelected
                              ? "bg-indigo-100 text-amber-700"
                              : "text-slate-300",
                        )}
                      >
                        {day.getDate()}
                      </span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {dayEvents.slice(0, 2).map((e) => {
                          const c = colorFor(e.event_type);
                          return (
                            <span
                              key={e.id}
                              className={cn(
                                "truncate rounded px-1 text-[10px] font-medium leading-4",
                                c.bg,
                                c.text,
                              )}
                            >
                              {e.title}
                            </span>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-muted-foreground pl-1">
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 px-1">
            {Object.entries(EVENT_COLORS).map(([type, c]) => (
              <span
                key={type}
                className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize"
              >
                <span className={cn("h-2 w-2 rounded-full", c.dot)} />
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* ── Day detail panel ─────────────────────────────────────────────── */}
        <div className="w-full xl:w-72 shrink-0">
          <div className="rounded-2xl border border-amber-500/15 bg-stone-950/75 shadow-lg backdrop-blur-md overflow-hidden sticky top-4">
            {/* Day header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {selectedDay
                    ? selectedDay.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "Select a day"}
                </p>
                {selectedDay && isSameDay(selectedDay, today) && (
                  <p className="text-[10px] text-amber-500 font-medium">
                    Today
                  </p>
                )}
              </div>
              {selectedDay && (
                <button
                  type="button"
                  onClick={() => openCreate(selectedDay)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/100 text-white hover:bg-amber-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Events list */}
            <div className="p-3 space-y-2 min-h-24">
              {!selectedDay ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Click a day to see events.
                </p>
              ) : selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CalendarDays className="h-7 w-7 text-slate-200" />
                  <p className="text-xs text-muted-foreground">No events</p>
                  <button
                    type="button"
                    onClick={() => openCreate(selectedDay)}
                    className="text-xs text-amber-500 hover:underline"
                  >
                    Add one
                  </button>
                </div>
              ) : (
                selectedEvents.map((e) => {
                  const c = colorFor(e.event_type);
                  return (
                    <div
                      key={e.id}
                      className={cn("group rounded-xl p-3", c.bg)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-xs font-semibold truncate",
                              c.text,
                            )}
                          >
                            {e.title}
                          </p>
                          {e.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {e.description}
                            </p>
                          )}
                          {e.start_date && (
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(e.start_date).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit" },
                              )}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(e)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Create event dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) setCreateOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md overflow-hidden p-0">
          <div className="h-1 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500" />
          <div className="p-6">
            <DialogHeader className="mb-5">
              <DialogTitle>Add Event</DialogTitle>
              <DialogDescription>
                Create a personal event on your calendar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Title <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Study session"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-slate-950/70"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any notes…"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="flex w-full rounded-md border border-input bg-slate-950/70 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Start date *
                  </label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({ ...form, start_date: e.target.value })
                    }
                    className="bg-slate-950/70"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    End date
                  </label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm({ ...form, end_date: e.target.value })
                    }
                    className="bg-slate-950/70"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Event type
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(EVENT_COLORS).map((t) => {
                    const c = colorFor(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, event_type: t })}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium capitalize border transition-all",
                          form.event_type === t
                            ? cn(c.bg, c.text, "border-transparent")
                            : "border-amber-500/15 bg-slate-950/70 text-slate-400 hover:border-amber-300/30",
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {createError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {createError}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating || !form.title.trim() || !form.start_date}
              className="bg-amber-400/100 hover:bg-amber-600 text-white min-w-24"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Adding…
                </>
              ) : (
                "Add Event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ────────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm overflow-hidden p-0">
          <div className="h-1 bg-linear-to-r from-rose-500 to-red-500" />
          <div className="p-6">
            <DialogHeader className="mb-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <DialogTitle>Delete event?</DialogTitle>
              <DialogDescription>
                <strong>"{deleteTarget?.title}"</strong> will be permanently
                deleted.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="px-6 pb-6 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white min-w-20"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
