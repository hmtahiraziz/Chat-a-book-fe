/**
 * Matches server `app.main._sanitize_filename` so /ingest/status and /ingest/control
 * use the same `filename` key the API uses for ingest_status.
 */
export function sanitizeFilenameForIngest(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? name;
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload.pdf";
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

/** Sanitized ingest key: same as backend `safe_name` for this upload. */
export function ingestStatusFilename(file: File, displayNameTrimmed: string): string {
  if (displayNameTrimmed) {
    const label = displayNameTrimmed.replace(/\\/g, "/").split("/").pop() ?? displayNameTrimmed;
    const synthetic = label.toLowerCase().endsWith(".pdf") ? label : `${label}.pdf`;
    return sanitizeFilenameForIngest(synthetic);
  }
  return sanitizeFilenameForIngest(file.name);
}
