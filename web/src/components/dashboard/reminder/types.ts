export type ReminderCategory = "work" | "personal" | "health" | "other";
export type ReminderPriority = "low" | "medium" | "high";
export type CompletionStatus = "pending" | "completed" | "skipped" | "deleted";

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  category: ReminderCategory;
  priority: ReminderPriority;
  initial_deadline: Date;
  completion_status: CompletionStatus;
  is_team_reminder: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: string;
}
