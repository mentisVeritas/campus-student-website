"use client";

import type { FormEvent } from "react";
import { DocumentType, RequestStatus, type Role } from "@prisma/client";
import { Paperclip } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { MAX_DOCUMENT_FILES, MAX_FILE_BYTES } from "@/lib/document-request-limits";
import { readResponseJson } from "@/lib/read-response-json";
import {
  allowedDocumentTypesForRole,
  documentTypeLabel,
} from "@/lib/document-requests-ui";

type Variant = "student" | "teacher" | "canteen";

type AttachmentMeta = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
};

type Row = {
  id: string;
  type: DocumentType;
  description: string | null;
  status: RequestStatus;
  adminNote: string | null;
  requestedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewerName: string | null;
  attachments: AttachmentMeta[];
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function roleFromVariant(v: Variant): Role {
  switch (v) {
    case "student":
      return "STUDENT";
    case "teacher":
      return "TEACHER";
    case "canteen":
      return "CANTEEN_STAFF";
    default:
      return "STUDENT";
  }
}

function statusHint(status: RequestStatus): string {
  switch (status) {
    case RequestStatus.PENDING:
      return "Queued at the registry — an administrator will review your request.";
    case RequestStatus.IN_PROGRESS:
      return "Your documents are being verified or prepared.";
    case RequestStatus.DONE:
      return "Approved. Follow the instructions in the administrator message below.";
    case RequestStatus.REJECTED:
      return "This request was declined. See the reason below.";
    default:
      return "";
  }
}

export default function DocumentRequestsPanel({
  variant,
  title,
  description,
}: {
  variant: Variant;
  title: string;
  description: string;
}) {
  const role = roleFromVariant(variant);
  const options = useMemo(() => allowedDocumentTypesForRole(role), [role]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formType, setFormType] = useState<DocumentType>(DocumentType.OTHER);
  const [formDesc, setFormDesc] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resolvedType = useMemo(
    () => (options.includes(formType) ? formType : (options[0] ?? DocumentType.OTHER)),
    [options, formType],
  );

  const load = useCallback(async () => {
    const response = await fetch("/api/document-requests", { credentials: "same-origin" });
    const payload = await readResponseJson<{ data?: Row[]; error?: string }>(response);
    if (payload === null) {
      setError(
        response.ok
          ? "Empty response from server."
          : "Could not read server response. Try refreshing or signing in again.",
      );
      setRows([]);
      return;
    }
    if (!response.ok) {
      setError(payload.error ?? "Could not load requests");
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("type", resolvedType);
      formData.append("description", formDesc.trim());
      const input = fileInputRef.current;
      const files = input?.files ? Array.from(input.files) : [];
      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch("/api/document-requests", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const rawBody = await response.text();
      let payload: { error?: string } | null = null;
      if (rawBody.trim()) {
        try {
          payload = JSON.parse(rawBody) as { error?: string };
        } catch {
          payload = null;
        }
      }
      if (payload === null) {
        setError(response.ok ? "Unexpected empty response." : "Submit failed — invalid server response.");
        return;
      }
      if (!response.ok) {
        setError(payload.error ?? "Submit failed");
        return;
      }
      setFormDesc("");
      if (input) input.value = "";
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <form onSubmit={submit} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">New request</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Requests appear instantly with status &quot;pending&quot;. The registry reviews them in order — you will get an in-app notification when the status changes. You may attach scans or photos (PDF, JPEG, PNG, WebP, GIF, HEIC) — up to{" "}
          {MAX_DOCUMENT_FILES} files, {MAX_FILE_BYTES / (1024 * 1024)} MB each.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,280px)_1fr]">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            Document type
            <select
              value={resolvedType}
              onChange={(event) => setFormType(event.target.value as DocumentType)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            >
              {options.map((type) => (
                <option key={type} value={type}>
                  {documentTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-1">
            Details (purpose, urgency, delivery preference)
            <textarea
              value={formDesc}
              onChange={(event) => setFormDesc(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Optional but recommended — helps registry process your request faster."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
        </div>
        <label className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            Attachments (optional)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/*,.heic,.heif"
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-1.5 file:text-xs file:font-medium dark:text-slate-300 dark:file:border-slate-600 dark:file:bg-slate-800"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {submitting ? "Sending…" : "Submit request"}
        </button>
      </form>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Your requests</h3>
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        ) : !rows.length ? (
          <EmptyState
            icon="📄"
            title="No requests yet"
            description="Submit a form above — it will show up here with live status."
          />
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{documentTypeLabel(row.type)}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Submitted {new Date(row.requestedAt).toLocaleString()}
                      {row.reviewedAt ? ` · Last update ${new Date(row.reviewedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{statusHint(row.status)}</p>
                <Timeline status={row.status} />
                {row.description ? (
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Your note: </span>
                    {row.description}
                  </p>
                ) : null}
                {row.attachments?.length ? (
                  <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Attached files</p>
                    {row.attachments.map((file) => (
                      <li key={file.id}>
                        <a
                          href={file.downloadUrl}
                          className="text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {file.originalFilename}
                        </a>
                        <span className="ml-2 text-xs text-slate-400">{formatBytes(file.sizeBytes)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {row.reviewerName ? (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Reviewed by {row.reviewerName}
                  </p>
                ) : null}
                {row.adminNote ? (
                  <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/80 p-3 text-sm text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100">
                    <span className="font-semibold">Registry message: </span>
                    {row.adminNote}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Timeline({ status }: { status: RequestStatus }) {
  const step2 = status !== RequestStatus.PENDING;
  const step3 = status === RequestStatus.DONE || status === RequestStatus.REJECTED;
  return (
    <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-white">1 · Sent</span>
      <span className="text-slate-300 dark:text-slate-600">→</span>
      <span
        className={`rounded-full px-2 py-0.5 ${step2 ? "bg-blue-600 text-white" : "border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800"}`}
      >
        2 · Review
      </span>
      <span className="text-slate-300 dark:text-slate-600">→</span>
      <span
        className={`rounded-full px-2 py-0.5 ${step3 ? "bg-violet-600 text-white" : "border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800"}`}
      >
        3 · Decision
      </span>
    </div>
  );
}
