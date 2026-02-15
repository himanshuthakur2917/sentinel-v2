import { ReminderDetailView } from "@/components/dashboard/reminder/reminder-detail-view";

interface PageProps {
  params: Promise<{
    id: string; // User ID from /dashboard/[id]
    reminderId: string; // Reminder ID from /reminders/[id] - NOTE: This creates a conflict!
  }>;
}

export default async function ReminderDetailPage({ params }: PageProps) {
  const { id: userId, reminderId } = await params;
  
  // We need to get userId from the URL path instead
  return <ReminderDetailView userId={userId} reminderId={reminderId} />;
}
