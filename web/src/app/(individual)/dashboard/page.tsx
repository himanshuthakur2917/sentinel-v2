import RemindersDashboard from "@/components/dashboard/reminder/reminders-dashboard";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          <RemindersDashboard />
        </div>
      </div>
    </div>
  );
}
