import PageHeader from "@/components/layout/PageHeader";
import { requireCurrentUser } from "@/lib/session";
import ProfileActionsPanel from "./ProfileActionsPanel";

export default async function ProfilePage() {
  const { user } = await requireCurrentUser();
  return (
    <div className="space-y-4">
      <PageHeader title="Profile" description="Manage your account settings." />
      <ProfileActionsPanel
        initialFirstName={user.firstName}
        initialLastName={user.lastName}
        email={user.email}
      />
    </div>
  );
}
