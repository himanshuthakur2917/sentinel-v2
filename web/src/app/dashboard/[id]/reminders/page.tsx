"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reminderApi } from "@/lib/api/reminders.api";
import { Reminder } from "@/types/reminder";
import { ReminderCard } from "@/components/reminder-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useReminderSubscription } from "@/hooks/use-reminder-subscription";

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Subscribe to real-time reminder updates
  useReminderSubscription();

  const { data: reminders, isLoading } = useQuery<Reminder[]>({
    queryKey: ["reminders"],
    queryFn: () => reminderApi.getReminders(),
  });

  const filteredReminders = (reminders || []).filter((reminder) => {
    // Filter by tab
    let matchesTab = true;
    if (activeTab === "pending") matchesTab = reminder.completion_status === "pending";
    if (activeTab === "completed") matchesTab = reminder.completion_status === "completed";
    if (activeTab === "overdue") {
      matchesTab =
        reminder.completion_status === "pending" &&
        new Date(reminder.initial_deadline) < new Date();
    }

    // Filter by search query
    const matchesSearch = reminder.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
        

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between gap-4">

        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search reminders..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>


        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReminders.length > 0 ? (
            filteredReminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border-dashed border-2">
               {searchQuery ? (
                  <p>No reminders found matching &quot;{searchQuery}&quot;</p>
               ) : (
                  <p>No reminders found for this filter.</p>
               )}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
