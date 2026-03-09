"use client";

import Image from "next/image";

import type { VideoHistoryEntry } from "@/lib/history";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoHistoryGrid({
  entries,
  onDelete,
  onLoad,
}: {
  entries: VideoHistoryEntry[];
  onDelete: (videoId: string) => void;
  onLoad: (entry: VideoHistoryEntry) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-10 w-full">
      <div className="mb-4 flex items-center justify-between px-1">
        <h2 className="text-sm font-medium text-[var(--foreground)]">
          Recent
        </h2>
        <span className="text-xs text-[var(--foreground-muted)]">
          {entries.length} video{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map((entry) => (
          <HistoryCard
            key={entry.id}
            entry={entry}
            onDelete={() => onDelete(entry.videoId)}
            onLoad={() => onLoad(entry)}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryCard({
  entry,
  onDelete,
  onLoad,
}: {
  entry: VideoHistoryEntry;
  onDelete: () => void;
  onLoad: () => void;
}) {
  const duration = entry.transcript.stats.durationSeconds;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] transition hover:border-[var(--line-strong)]">
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onLoad}
        className="relative aspect-video w-full overflow-hidden bg-[var(--panel-soft)]"
      >
        {entry.thumbnailUrl ? (
          <Image
            src={entry.thumbnailUrl}
            alt={entry.title ?? "Video thumbnail"}
            fill
            className="object-cover transition group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--foreground-muted)]">
            No thumbnail
          </div>
        )}
        {duration > 0 && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
            {formatDuration(duration)}
          </span>
        )}
      </button>

      {/* Info */}
      <button
        type="button"
        onClick={onLoad}
        className="flex flex-1 flex-col gap-1 px-3 py-2.5 text-left"
      >
        <span className="line-clamp-2 text-[13px] font-medium leading-tight text-[var(--foreground)]">
          {entry.title ?? "Untitled"}
        </span>
        <span className="text-[11px] text-[var(--foreground-muted)]">
          {entry.authorName ?? "Unknown channel"}
        </span>
        <span className="mt-auto text-[10px] text-[var(--foreground-muted)]/50">
          {formatRelativeTime(entry.savedAt)}
          {entry.chatMessages.length > 0 && (
            <> &middot; {entry.chatMessages.length} messages</>
          )}
        </span>
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white/70 opacity-0 transition hover:bg-black/80 hover:text-white group-hover:opacity-100"
        title="Remove from history"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
