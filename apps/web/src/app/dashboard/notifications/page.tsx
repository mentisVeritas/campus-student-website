import PageContainer from "@/components/common/page-container";

export default function NotificationsPage() {
  return (
    <PageContainer
      title="Academic Notifications"
      description="Important reminders and alerts for students."
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Academic debt warning: one pending retake.
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          New update: schedule changes published for Thursday.
        </div>
      </div>
    </PageContainer>
  );
}
