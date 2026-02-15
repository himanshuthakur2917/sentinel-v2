import { httpClient } from "./client";
import { Reminder } from "@/types/reminder";

export interface CreateReminderRequest {
  title: string;
  description?: string;
  category: string;
  priority?: string;
  initial_deadline: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  is_team_reminder?: boolean;
  team_id?: string;
}

export interface UpdateReminderRequest extends Partial<CreateReminderRequest> {
  completion_status?: string;
  completed_at?: string;
  accepted_time?: string;
}

export const reminderApi = {
  /**
   * Get user's reminders
   */
  getReminders: async (
    filter?: "all" | "today" | "overdue" | "upcoming",
  ): Promise<Reminder[]> => {
    return httpClient.get<Reminder[]>(
      `/reminders${filter ? `?filter=${filter}` : ""}`,
    );
  },

  /**
   * Get dashboard stats
   */
  getStats: async (): Promise<any> => {
    return httpClient.get<any>("/reminders/dashboard/stats");
  },

  /**
   * Create a new reminder
   */
  create: async (data: CreateReminderRequest): Promise<Reminder> => {
    return httpClient.post<Reminder>("/reminders", data);
  },

  /**
   * Update a reminder
   */
  update: async (
    id: string,
    data: UpdateReminderRequest,
  ): Promise<Reminder> => {
    return httpClient.patch<Reminder>(`/reminders/${id}`, data);
  },

  /**
   * Delete a reminder
   */
  delete: async (id: string): Promise<void> => {
    return httpClient.delete<void>(`/reminders/${id}`);
  },
};
