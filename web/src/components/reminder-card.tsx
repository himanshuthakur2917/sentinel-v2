import * as React from "react";
import { Check, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Reminder } from "@/types/reminder/reminder";
import { reminderApi } from "@/lib/api/reminders.api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function ReminderCard({ reminder }: { reminder: Reminder }) {
  const queryClient = useQueryClient();
  const date = new Date(reminder.initial_deadline);
  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    date,
  );
  const dayNumber = date.getDate();
  const timeString = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);

  // Format completed date if available
  const completedDate = reminder.completed_at ? new Date(reminder.completed_at) : null;
  const completedDateString = completedDate
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(completedDate)
    : "";

  const isCompleted = reminder.completion_status === "completed";

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      await reminderApi.update(reminder.id, {
        completion_status: "completed",
        completed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Reminder marked as complete");
    },
    onError: (error) => {
      toast.error("Failed to update reminder");
      console.error(error);
    },
  });

  return (
    <Card
      className={cn(
        "overflow-hidden border-none shadow-sm ring-1 ring-border bg-card justify-between transition-opacity duration-300",
        isCompleted && "opacity-60 grayscale-[0.5]"
      )}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Header Row: Date Box + Title */}
        <div className="flex items-start gap-3">
          {/* Date Box */}
          <div className="flex flex-col items-center justify-center bg-primary text-primary-foreground rounded-lg min-w-14 h-14 p-1 shadow-sm">
            <span className="text-xs font-medium uppercase leading-none">
              {dayName}
            </span>
            <span className="text-xl font-bold leading-none mt-0.5">
              {dayNumber}
            </span>
          </div>

          {/* Title & Time */}
          <div className="flex-1 min-w-0 flex flex-col justify-center h-14">
            <h3
              className="font-semibold text-foreground truncate pr-2"
              title={reminder.title}
            >
              {reminder.title}
            </h3>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <span>at {timeString}</span>
            </div>
          </div>

          {/* Arrow/Action */}
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="View reminder details"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Recurrence Days Placeholder */}
        {reminder.is_recurring && (
          <div className="flex items-center gap-1 pl-[4.25rem]">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => {
              // Determine if this day is active based on recurrence pattern
              let isActive = false;
              const pattern = reminder.recurrence_pattern?.toLowerCase();
              const deadlineDay = new Date(reminder.initial_deadline).getDay(); // 0 = Sunday

              if (pattern === "daily") {
                isActive = true;
              } else if (pattern === "weekly") {
                isActive = index === deadlineDay;
              } else if (pattern === "weekdays") {
                isActive = index >= 1 && index <= 5;
              } else if (pattern === "weekends") {
                isActive = index === 0 || index === 6;
              } else if (pattern === "monthly") {
                // For monthly, just show the current deadline day as active for now
                isActive = index === deadlineDay;
              }

              return (
                <div
                  key={index}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-medium transition-colors border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-transparent",
                  )}
                >
                  {day}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div
        className={cn(
          "px-4 py-2 text-sm font-medium flex items-center gap-2",
          isCompleted
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-muted/50 text-muted-foreground",
        )}
      >
        {isCompleted ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-600 p-0.5 text-white dark:bg-green-500">
                <Check className="h-3 w-3" />
              </div>
              <span>Completed</span>
            </div>
            {completedDateString && (
              <span className="text-xs opacity-80 font-normal">
                {completedDateString}
              </span>
            )}
          </div>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors w-full">
                <Checkbox
                  className="rounded-full data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 pointer-events-none"
                />
                <label
                  className="cursor-pointer flex-1"
                >
                  Mark as complete
                </label>
              </div>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark as Complete?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to mark this reminder as completed? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => markCompleteMutation.mutate()}
                  disabled={markCompleteMutation.isPending}
                >
                  {markCompleteMutation.isPending ? "Marking..." : "Yes, Mark Complete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );
}
