"use client";

type Props = {
  bookName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export function DeleteConfirmModal({ bookName, onConfirm, onCancel, isLoading }: Props) {
  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm delete"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--danger-bg)] ring-1 ring-[var(--danger-border)]">
            <svg className="h-5 w-5 text-[var(--danger)]" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg text-[var(--text)]">Remove book</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-[var(--text)]">&ldquo;{bookName}&rdquo;</span>?
              {" "}Indexed data and the PDF will be deleted unless another index still uses the same file.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel-soft)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLoading && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {isLoading ? "Removing…" : "Remove book"}
          </button>
        </div>
      </div>
    </div>
  );
}
