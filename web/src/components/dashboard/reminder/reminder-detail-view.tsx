"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

import { reminderApi, UpdateReminderRequest } from "@/lib/api/reminders.api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ManualInputForm } from "./manual-input-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReminderDetailViewProps {
  userId: string;
  reminderId: string;
}

export function ReminderDetailView({ userId, reminderId }: ReminderDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch reminder data
  const { data: reminder, isLoading, error } = useQuery({
    queryKey: ["reminder", reminderId],
    queryFn: () => reminderApi.getById(reminderId),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateReminderRequest) => reminderApi.update(reminderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder", reminderId] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsEditing(false);
      toast.success("Reminder updated successfully");
    },
    onError: () => {
      toast.error("Failed to update reminder");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => reminderApi.delete(reminderId),
    onSuccess: () => {
      toast.success("Reminder deleted successfully");
      router.push(`/dashboard/${userId}/reminders`);
    },
    onError: () => {
      toast.error("Failed to delete reminder");
    },
  });

  // Mark complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      await reminderApi.update(reminderId, {
        completion_status: completed ? "completed" : "pending",
        completed_at: completed ? new Date().toISOString() : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder", reminderId] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(reminder?.completion_status === "completed" ? "Marked as incomplete" : "Marked as complete");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const handleBack = () => {
    router.push(`/dashboard/${userId}/reminders`);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  const handleSaveEdit = (data: UpdateReminderRequest) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !reminder) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Button variant="ghost" onClick={handleBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reminders
        </Button>
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Reminder not found</p>
        </Card>
      </div>
    );
  }

  const isCompleted = reminder.completion_status === "completed";
  const isOverdue = !isCompleted && new Date() > new Date(reminder.initial_deadline);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date(dateString));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      work: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      personal: "bg-green-500/10 text-green-700 dark:text-green-400",
      health: "bg-red-500/10 text-red-700 dark:text-red-400",
      other: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    };
    return colors[category] || colors.other;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-500/10 text-red-700 dark:text-red-400",
      medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      low: "bg-green-500/10 text-green-700 dark:text-green-400",
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Back Button */}
      <Button variant="ghost" onClick={handleBack} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Reminders
      </Button>

      {/* Main Content */}
      {isEditing ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Edit Reminder</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
          <ManualInputForm
            onProceed={handleSaveEdit}
            onBack={() => setIsEditing(false)}
            onClose={() => setIsEditing(false)}
            initialData={{
              title: reminder.title,
              description: reminder.description,
              category: reminder.category,
              priority: reminder.priority,
              initial_deadline: reminder.initial_deadline,
              is_recurring: reminder.is_recurring,
              recurrence_pattern: reminder.recurrence_pattern,
            }}
          />
        </Card>
      ) : (
        <Card className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-3">{reminder.title}</h1>
                <div className="flex flex-wrap gap-2">
                  {isCompleted && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                      <Check className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                  {isOverdue && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
                      Overdue
                    </Badge>
                  )}
                  <Badge variant="outline" className={getCategoryColor(reminder.category)}>
                    {reminder.category}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(reminder.priority)}>
                    {reminder.priority} priority
                  </Badge>
                  {reminder.is_recurring && (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400">
                      {reminder.recurrence_pattern}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {reminder.description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Description</h3>
              <p className="text-sm">{reminder.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Deadline</p>
              <p className="text-sm">{formatDate(reminder.initial_deadline instanceof Date ? reminder.initial_deadline.toISOString() : reminder.initial_deadline)}</p>
            </div>
            {reminder.completed_at && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Completed On</p>
                <p className="text-sm">{formatDate(typeof reminder.completed_at === 'string' ? reminder.completed_at : reminder.completed_at.toISOString())}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => markCompleteMutation.mutate(!isCompleted)}
              disabled={markCompleteMutation.isPending}
            >
              {isCompleted ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Mark Incomplete
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mark Complete
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the reminder &quot;{reminder.title}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
