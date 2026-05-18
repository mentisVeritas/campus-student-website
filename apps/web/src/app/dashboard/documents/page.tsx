import { redirect } from "next/navigation";
import { documentsInboxHref } from "@/lib/document-requests-ui";
import { requireCurrentUser } from "@/lib/session";

/** Legacy URL — forwards to role-specific inbox. */
export default async function DashboardDocumentsRedirectPage() {
  const { user } = await requireCurrentUser();
  redirect(documentsInboxHref(user.role));
}
