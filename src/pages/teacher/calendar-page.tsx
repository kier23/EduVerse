import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListItemCard } from "@/components/layout/list-item-card";
import { AppShell } from "@/layouts/app-shell";
import { createEvent, fetchCalendarEvents, type EventItem } from "@/lib/api/eduverse";
import { useAuth } from "@/providers/auth-provider";

export function TeacherCalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadEvents = () => {
    if (!user) return;
    fetchCalendarEvents(user.id).then(setEvents);
  };

  useEffect(() => {
    loadEvents();
  }, [user]);

  const onAddEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    await createEvent({
      created_by: user.id,
      subject_id: null,
      title,
      description: "Calendar event",
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      event_type: "general",
    });
    setTitle("");
    setStartDate("");
    setEndDate("");
    loadEvents();
  };

  return (
    <AppShell title="Calendar / Schedule">
      <Card className="mb-6">
        <div className="h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
        <CardHeader>
          <CardTitle>Add Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onAddEvent}>
            <Input className="md:col-span-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Event title" required />
            <Input value={startDate} onChange={(event) => setStartDate(event.target.value)} type="datetime-local" required />
            <Input value={endDate} onChange={(event) => setEndDate(event.target.value)} type="datetime-local" required />
            <Button className="md:col-span-4" type="submit">Add event</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events scheduled yet.</p>
          ) : (
            events.map((eventItem) => (
              <ListItemCard key={eventItem.id}>
                <p className="font-medium">{eventItem.title}</p>
                <p className="text-sm text-muted-foreground">
                  {eventItem.start_date ? new Date(eventItem.start_date).toLocaleString() : "—"} to{" "}
                  {eventItem.end_date ? new Date(eventItem.end_date).toLocaleString() : "—"}
                </p>
              </ListItemCard>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
