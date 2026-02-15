"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth.store";

export function useReminderSubscription() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();

    console.log("[WebSocket] Setting up reminder subscriptions");

    // Listen for reminder events
    const handleReminderCreated = (data: any) => {
      console.log("[WebSocket] Reminder created:", data);
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    };

    const handleReminderUpdated = (data: any) => {
      console.log("[WebSocket] Reminder updated:", data);
      queryClient.invalidateQueries({ queryKey: ["reminder", data.id] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    };

    const handleReminderDeleted = (data: any) => {
      console.log("[WebSocket] Reminder deleted:", data);
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    };

    socket.on("reminder:created", handleReminderCreated);
    socket.on("reminder:updated", handleReminderUpdated);
    socket.on("reminder:deleted", handleReminderDeleted);

    // Cleanup on unmount
    return () => {
      console.log("[WebSocket] Cleaning up reminder subscriptions");
      socket.off("reminder:created", handleReminderCreated);
      socket.off("reminder:updated", handleReminderUpdated);
      socket.off("reminder:deleted", handleReminderDeleted);
    };
  }, [user?.id, queryClient]);
}
