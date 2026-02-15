"use client";

import * as React from "react";
import { ReminderCard } from "@/components/reminder-card";
import { Reminder } from "@/types/reminder";
import { Button } from "@/components/ui/button";

// Helper to create dates relative to now
const now = new Date();
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};


// --- Helper Functions ---

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getWeekNumber(d: Date) {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return weekNo;
}

function isThisWeek(d: Date) {
  const today = new Date();
  // Check if same year and week number
  return (
    d.getFullYear() === today.getFullYear() &&
    getWeekNumber(d) === getWeekNumber(today)
  );
}

function isThisMonth(d: Date) {
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
  );
}

function ReminderSection({
  title,
  reminders,
}: {
  title: string;
  reminders: Reminder[];
}) {
  const [showAll, setShowAll] = React.useState(false);

  // Only show 3 if not expanded
  const displayedReminders = showAll ? reminders : reminders.slice(0, 3);
  const hasMore = reminders.length > 3;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-muted-foreground">{title}</h2>
        {hasMore && (
          <Button
            variant="link"
            onClick={() => setShowAll(!showAll)}
            className="text-sm h-auto p-0 text-primary"
          >
            {showAll ? "Show Less" : "Show All"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {displayedReminders.map((reminder) => (
          <ReminderCard key={reminder.id} reminder={reminder} />
        ))}
        {displayedReminders.length === 0 && (
          <p className="text-muted-foreground text-sm italic col-span-full">
            No reminders for {title.toLowerCase()}.
          </p>
        )}
      </div>
    </section>
  );
}

export default function RemindersDashboard({
  reminders = [],
}: {
  reminders?: Reminder[];
}) {
  // Convert ISO date strings to Date objects and filter personal reminders
  const personalReminders = reminders
    .filter((r) => !r.is_team_reminder)
    .map((r) => ({
      ...r,
      initial_deadline: new Date(r.initial_deadline),
    }));

  const now = new Date();

  // Filter groups
  const todayReminders = personalReminders.filter((r) =>
    isSameDay(r.initial_deadline, now),
  );

  const weekReminders = personalReminders.filter(
    (r) =>
      !isSameDay(r.initial_deadline, now) && isThisWeek(r.initial_deadline),
  );

  const monthReminders = personalReminders.filter(
    (r) =>
      !isSameDay(r.initial_deadline, now) &&
      !isThisWeek(r.initial_deadline) &&
      isThisMonth(r.initial_deadline),
  );

  return (
    <div className="flex flex-col gap-8 w-full">
      <ReminderSection title="Today" reminders={todayReminders} />
      <ReminderSection title="This Week" reminders={weekReminders} />
      <ReminderSection title="This Month" reminders={monthReminders} />
    </div>
  );
}
