"use client";

import { DocumentType, RequestStatus, Role } from "@prisma/client";
import { Paperclip } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { readResponseJson } from "@/lib/read-response-json";

type AdminAttachment = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
};

type AdminRow = {
  id: string;
  type: DocumentType;
  typeLabel: string;
  status: RequestStatus;
  description: string | null;
  adminNote: string | null;
  requestedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  requester: { name: string; email: string; role: Role };
  reviewerName: string | null;
  student: { name: string; className: string | null } | null;
  attachments: AdminAttachment[];
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function roleBadgeClass(role: Role): string {
  switch (role) {
    case Role.STUDENT:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
    case Role.TEACHER:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
    case Role.CANTEEN_STAFF:
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function AdminDocumentRequestsClient() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminRow | null>(null);
  const [status, setStatus] = useState<RequestStatus>(RequestStatus.PENDING);
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/document-requests", { credentials: "same-origin" });
    const payload = await readResponseJson<{ data?: AdminRow[]; error?: string }>(response);
    if (payload === null) {
      setError(
        response.ok ? "Empty response from server." : "Could not read server response — check login or migrations.",
      );
      setRows([]);
      return;
    }
    if (!response.ok) {
      setError(payload.error ?? "Could not load");
      setRows([]);
      return;
    }
    setRows(payload.data ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const openModal = (row: AdminRow) => {
    setSelected(row);
    setStatus(row.status);
    setAdminNote(row.adminNote ?? "");
    setModalError(null);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setModalError(null);
    try {
      const response = await fetch(`/api/admin/document-requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          status,
          adminNote: adminNote.trim() || undefined,
        }),
      });
      const raw = await response.text();
      let payload: { error?: string } | null = null;
      if (raw.trim()) {
        try {
          payload = JSON.parse(raw) as { error?: string };
        } catch {
          payload = null;
        }
      }
      if (payload === null) {
        setModalError(response.ok ? "Empty response." : "Invalid server response.");
        return;
      }
      if (!response.ok) {
        setModalError(payload.error ?? "Update failed");
        return;
      }
      setSelected(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Incoming requests appear as <strong>pending</strong>. Update status when you verify details: move to{" "}
        <strong>in progress</strong> while preparing documents, then <strong>done</strong> when approved or{" "}
        <strong>rejected</strong> with a visible reason for the applicant.
      </p>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Requester</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Document</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Files</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Submitted</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{row.requester.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{row.requester.email}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${roleBadgeClass(row.requester.role)}`}>
                      {row.requester.role.replace("_", " ")}
                    </span>
                    {row.student ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Student record: {row.student.name}
                        {row.student.className ? ` · ${row.student.className}` : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{row.typeLabel}</p>
                    {row.description ? (
                      <p className="mt-1 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">{row.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.attachments?.length ? (
                      <span className="inline-flex max-w-[min(220px,28vw)] flex-col gap-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate" title={row.attachments.map((a) => a.originalFilename).join(", ")}>
                            {row.attachments[0].originalFilename}
                          </span>
                        </span>
                        {row.attachments.length > 1 ? (
                          <span className="pl-5 text-[10px] font-normal text-slate-500 dark:text-slate-400">
                            +{row.attachments.length - 1} more
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                    {new Date(row.requestedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openModal(row)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={selected !== null} title="Review document request" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
              <p>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{selected.requester.name}</span> ·{" "}
                {selected.typeLabel}
              </p>
              {selected.description ? <p className="mt-2 text-slate-600 dark:text-slate-300">{selected.description}</p> : null}
            </div>

            {selected.attachments?.length ? (
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-600">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attachments from applicant
                </p>
                <ul className="space-y-1.5">
                  {selected.attachments.map((file) => (
                    <li key={file.id} className="text-sm">
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                      >
                        {file.originalFilename}
                      </a>
                      <span className="ml-2 text-xs text-slate-500">{formatBytes(file.sizeBytes)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              New status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as RequestStatus)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value={RequestStatus.PENDING}>Pending — waiting in queue</option>
                <option value={RequestStatus.IN_PROGRESS}>In progress — preparing / verifying</option>
                <option value={RequestStatus.DONE}>Done — approved (pickup / digital)</option>
                <option value={RequestStatus.REJECTED}>Rejected — must explain below</option>
              </select>
            </label>

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Message to applicant (shown on their Documents page)
              <textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder={
                  status === RequestStatus.REJECTED
                    ? "Explain why the request cannot be fulfilled (required for rejection)."
                    : "Optional: pickup room, office hours, PDF link, or extra instructions."
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            {status === RequestStatus.REJECTED ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">Rejections require a clear reason (min. 3 characters).</p>
            ) : null}

            {modalError ? <p className="text-sm text-rose-600">{modalError}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm dark:border-slate-600 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-indigo-500"
              >
                {saving ? "Saving…" : "Save decision"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
