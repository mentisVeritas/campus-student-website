import DashboardShell from "@/components/layout/DashboardShell";
import { buildAnnouncementWhereForUser } from "@/lib/announcement-visibility";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireCurrentUser();
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });
  const announcementWhere = await buildAnnouncementWhereForUser({
    role: user.role,
    userId: user.id,
    scope: user.role === "ADMIN" ? "all" : null,
  });
  let unreadAnnouncementCount = 0;
  try {
    unreadAnnouncementCount = await prisma.announcement.count({
      where: {
        AND: [
          announcementWhere ?? {},
          { reads: { none: { userId: user.id } } },
        ],
      },
    });
  } catch {
    unreadAnnouncementCount = 0;
  }

  return (
    <DashboardShell
      role={user.role}
      unreadCount={unreadCount}
      unreadAnnouncementCount={unreadAnnouncementCount}
    >
      {children}
    </DashboardShell>
  );
}
