import type { AssistantMessage, TranscriptPayload } from "@/lib/contracts";
import type { GeneratedDocumentState } from "@/lib/workspace";

export const HISTORY_STORAGE_KEY = "transcript-desk.history";
export const SETTINGS_STORAGE_KEY = "transcript-desk.settings";

export interface VideoHistoryEntry {
  id: string;
  videoId: string;
  title: string | null;
  authorName: string | null;
  thumbnailUrl: string | null;
  canonicalUrl: string;
  language: string;
  savedAt: number;
  transcript: TranscriptPayload;
  chatMessages: AssistantMessage[];
  summaryContent: string;
  detailContent: string;
}

export interface PersistedSettings {
  provider: "openai" | "anthropic" | "google";
  instruction: string;
  providerModels: Record<string, string>;
  apiKeys: Record<string, string>;
}

// --------------- History ---------------

export function readHistory(): VideoHistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as VideoHistoryEntry[];
  } catch {
    return [];
  }
}

export function writeHistory(entries: VideoHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

export function saveToHistory(
  transcript: TranscriptPayload,
  chatMessages: AssistantMessage[],
  summaryState: GeneratedDocumentState,
  detailState: GeneratedDocumentState,
) {
  const entries = readHistory();

  const existing = entries.findIndex(
    (e) => e.videoId === transcript.videoId,
  );

  const entry: VideoHistoryEntry = {
    id: `${transcript.videoId}-${Date.now()}`,
    videoId: transcript.videoId,
    title: transcript.title,
    authorName: transcript.authorName,
    thumbnailUrl: transcript.thumbnailUrl,
    canonicalUrl: transcript.canonicalUrl,
    language: transcript.language.code,
    savedAt: Date.now(),
    transcript,
    chatMessages,
    summaryContent: summaryState.status === "loaded" ? summaryState.content : "",
    detailContent: detailState.status === "loaded" ? detailState.content : "",
  };

  if (existing >= 0) {
    entries[existing] = { ...entry, id: entries[existing].id };
  } else {
    entries.unshift(entry);
  }

  writeHistory(entries);
  return entry;
}

export function deleteFromHistory(videoId: string) {
  const entries = readHistory().filter((e) => e.videoId !== videoId);
  writeHistory(entries);
  return entries;
}

// --------------- Settings ---------------

export function readSettings(): PersistedSettings | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSettings;
  } catch {
    return null;
  }
}

export function writeSettings(settings: PersistedSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
