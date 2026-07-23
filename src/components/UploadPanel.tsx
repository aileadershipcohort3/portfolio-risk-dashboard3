"use client";

import type { ChangeEvent } from "react";

interface UploadPanelProps {
  inputId: string;
  title: string;
  subtitle: string;
  accept: string;
  selectedFileName: string | null;
  onFileSelected: (file: File | null) => void;
}

export default function UploadPanel({
  inputId,
  title,
  subtitle,
  accept,
  selectedFileName,
  onFileSelected,
}: UploadPanelProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onFileSelected(e.target.files?.[0] ?? null);
  }

  return (
    <div className="rounded-xl border p-5 shadow-sm bg-white" style={{ borderColor: "var(--border)" }}>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
        {subtitle}
      </p>
      <div className="mt-4">
        <label htmlFor={inputId} className="sr-only">
          {title}
        </label>
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="block w-full text-sm text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:text-white file:bg-[var(--ink)] hover:file:opacity-90 file:cursor-pointer cursor-pointer"
        />
      </div>
      {selectedFileName && (
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Selected: <span className="font-semibold" style={{ color: "var(--foreground)" }}>{selectedFileName}</span>
        </p>
      )}
    </div>
  );
}
