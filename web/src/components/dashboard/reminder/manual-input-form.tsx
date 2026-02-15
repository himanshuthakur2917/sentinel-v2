"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/calendar/date-time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Reminder } from "@/types/reminder";
import { reminderApi, CreateReminderRequest } from "@/lib/api/reminders.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ManualInputFormProps {
  initialData?: Partial<Reminder>;
  onBack: () => void;
  onClose: () => void;
}

export function ManualInputForm({
  initialData,
  onBack,
  onClose,
}: ManualInputFormProps) {
  const [formData, setFormData] = React.useState<Partial<Reminder>>({
    title: "",
    description: "",
    category: "personal",
    priority: "medium",
    initial_deadline: new Date(),
    is_recurring: false,
    recurrence_pattern: "daily",
    ...initialData,
  });

  const queryClient = useQueryClient();

  const createReminderMutation = useMutation({
    mutationFn: (data: CreateReminderRequest) => reminderApi.create(data),
    onSuccess: () => {
      toast.success("Reminder created successfully");
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create reminder: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare data for API
    const reminderData: CreateReminderRequest = {
        title: formData.title || "",
        description: formData.description,
        category: formData.category || "personal",
        priority: formData.priority,
        initial_deadline: formData.initial_deadline ? formData.initial_deadline.toISOString() : new Date().toISOString(),
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.recurrence_pattern,
    };

    createReminderMutation.mutate(reminderData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g., Pay electricity bill"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Add any extra details..."
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(val: any) =>
              setFormData({ ...formData, category: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(val: any) =>
              setFormData({ ...formData, priority: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="deadline">Date & Time</Label>
        <div className="flex gap-2">
          <DateTimePicker
            date={formData.initial_deadline}
            setDate={(date) => {
              if (date) {
                setFormData({ ...formData, initial_deadline: date });
              }
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border rounded-md p-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="recurring"
            checked={formData.is_recurring}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, is_recurring: !!checked })
            }
          />
          <label
            htmlFor="recurring"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Recurring Reminder
          </label>
        </div>

        {formData.is_recurring && (
          <div className="pl-6 grid gap-2">
            <Label
              htmlFor="recurrence-pattern"
              className="text-xs text-muted-foreground"
            >
              Repeats
            </Label>
            <Select
              value={
                formData.recurrence_pattern?.startsWith("custom_weekly")
                  ? "custom_weekly"
                  : formData.recurrence_pattern
              }
              onValueChange={(val) => {
                if (val === "custom_weekly") {
                  // Initialize with no days selected or maybe today? Let's verify defaults.
                  // Or keep existing if already custom?
                  if (
                    !formData.recurrence_pattern?.startsWith("custom_weekly")
                  ) {
                    setFormData({
                      ...formData,
                      recurrence_pattern: "custom_weekly:",
                    });
                  }
                } else {
                  setFormData({ ...formData, recurrence_pattern: val });
                }
              }}
            >
              <SelectTrigger id="recurrence-pattern" className="w-full h-9">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily (Every Day)</SelectItem>
                <SelectItem value="weekdays">Weekdays (Mon - Fri)</SelectItem>
                <SelectItem value="weekends">Weekends (Sat - Sun)</SelectItem>
                <SelectItem value="weekly">
                  Weekly (Same day each week)
                </SelectItem>
                <SelectItem value="monthly">
                  Monthly (Same date each month)
                </SelectItem>
                <SelectItem value="custom_weekly">
                  Custom (Select Days)
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Day Selector */}
            {formData.recurrence_pattern?.startsWith("custom_weekly") && (
              <div className="flex items-center gap-2 mt-2 justify-center">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => {
                  // Parse current pattern to see if selected
                  // Format: "custom_weekly:0,1,2..."
                  let currentIndices: number[] = [];
                  if (
                    formData.recurrence_pattern?.startsWith("custom_weekly:")
                  ) {
                    const parts = formData.recurrence_pattern.split(":")[1];
                    if (parts) {
                      currentIndices = parts
                        .split(",")
                        .map((p) => p.trim())
                        .filter((p) => p !== "")
                        .map(Number)
                        .filter((n) => !isNaN(n));
                    }
                  }

                  const isSelected = currentIndices.includes(index);

                  const toggleDay = () => {
                    let newIndices = [...currentIndices];
                    if (isSelected) {
                      newIndices = newIndices.filter((i) => i !== index);
                    } else {
                      newIndices.push(index);
                    }
                    newIndices.sort((a, b) => a - b);
                    setFormData({
                      ...formData,
                      recurrence_pattern: `custom_weekly:${newIndices.join(",")}`,
                    });
                  };

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={toggleDay}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-muted-foreground border-input hover:border-sidebar-ring hover:bg-sidebar-accent",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Helper text to explain the schedule */}
            <p className="text-[0.8rem] text-muted-foreground mt-1">
              {formData.recurrence_pattern === "daily" &&
                "Reminds you every single day."}
              {formData.recurrence_pattern === "weekdays" &&
                "Reminds you every Monday through Friday."}
              {formData.recurrence_pattern === "weekends" &&
                "Reminds you every Saturday and Sunday."}
              {formData.recurrence_pattern === "weekly" &&
                "Reminds you once a week on this specific day."}
              {formData.recurrence_pattern === "monthly" &&
                "Reminds you once a month on this specific date."}
              {formData.recurrence_pattern?.startsWith("custom_weekly") &&
                "Reminds you on selected days."}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={createReminderMutation.isPending}>
          {createReminderMutation.isPending ? "Creating..." : "Create Reminder"}
        </Button>
      </div>
    </form>
  );
}
