import { ReminderCategory } from "./category";
import { ReminderPriority } from "./priority";
import { CompletionStatus } from "./status";

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
