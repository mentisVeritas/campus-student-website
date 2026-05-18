import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export default function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}
