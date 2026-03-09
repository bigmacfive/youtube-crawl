import type { AssistantMessage, AssistantProvider, TranscriptPayload } from "@/lib/contracts";
import { formatTimestamp, type TranscriptSegment } from "@/lib/youtube";

export const WORKSPACE_STORAGE_KEY = "transcript-desk.workspace.v2";

export type ContentTab = "script" | "summary" | "detail";
export type LoadStatus = "idle" | "loading" | "loaded" | "error";

export interface GeneratedDocumentState {
  status: LoadStatus;
  content: string;
  error: string;
}

export interface SelectedVideo {
  videoId: string;
  title: string | null;
  canonicalUrl: string;
  authorName: string | null;
  thumbnailUrl: string | null;
}

export interface ScriptSection {
  id: string;
  label: string;
  start: number;
  end: number;
  segments: TranscriptSegment[];
}

export interface StructuredBlock {
  type: "heading" | "bullet" | "paragraph";
  value: string;
}

export type ProviderMap = Record<AssistantProvider, string>;

export interface PersistedWorkspace {
  url: string;
  language: string;
  provider: AssistantProvider;
  instruction: string;
  activeTab: ContentTab;
  transcript: TranscriptPayload | null;
  selectedVideo: SelectedVideo | null;
  summaryState: GeneratedDocumentState;
  detailState: GeneratedDocumentState;
  chatMessages: AssistantMessage[];
  providerModels: ProviderMap;
  apiKeys: ProviderMap;
}

export function createDefaultModels(): ProviderMap {
  return {
    openai: "gpt-5",
    anthropic: "claude-sonnet-4-20250514",
    google: "gemini-2.5-flash",
  };
}

export function createEmptyProviderMap(): ProviderMap {
  return {
    openai: "",
    anthropic: "",
    google: "",
  };
}

export function createIdleDocumentState(): GeneratedDocumentState {
  return {
    status: "idle",
    content: "",
    error: "",
  };
}

export function createInitialWorkspace(): PersistedWorkspace {
  return {
    url: "",
    language: "",
    provider: "openai",
    instruction: "",
    activeTab: "script",
    transcript: null,
    selectedVideo: null,
    summaryState: createIdleDocumentState(),
    detailState: createIdleDocumentState(),
    chatMessages: [],
    providerModels: createDefaultModels(),
    apiKeys: createEmptyProviderMap(),
  };
}

export function readWorkspaceStorage(): PersistedWorkspace {
  if (typeof window === "undefined") {
    return createInitialWorkspace();
  }

  const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);

  if (!raw) {
    return createInitialWorkspace();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspace>;
    const initial = createInitialWorkspace();

    return {
      ...initial,
      url: typeof parsed.url === "string" ? parsed.url : initial.url,
      language:
        typeof parsed.language === "string" ? parsed.language : initial.language,
      provider:
        parsed.provider === "openai" ||
        parsed.provider === "anthropic" ||
        parsed.provider === "google"
          ? parsed.provider
          : initial.provider,
      instruction:
        typeof parsed.instruction === "string"
          ? parsed.instruction
          : initial.instruction,
      activeTab:
        parsed.activeTab === "script" ||
        parsed.activeTab === "summary" ||
        parsed.activeTab === "detail"
          ? parsed.activeTab
          : initial.activeTab,
      transcript:
        parsed.transcript && typeof parsed.transcript === "object"
          ? (parsed.transcript as TranscriptPayload)
          : initial.transcript,
      selectedVideo:
        parsed.selectedVideo && typeof parsed.selectedVideo === "object"
          ? (parsed.selectedVideo as SelectedVideo)
          : initial.selectedVideo,
      summaryState: coerceDocumentState(parsed.summaryState),
      detailState: coerceDocumentState(parsed.detailState),
      chatMessages: Array.isArray(parsed.chatMessages)
        ? parsed.chatMessages.filter(isAssistantMessage)
        : initial.chatMessages,
      providerModels: mergeProviderMap(parsed.providerModels, initial.providerModels),
      apiKeys: mergeProviderMap(parsed.apiKeys, initial.apiKeys),
    };
  } catch {
    return createInitialWorkspace();
  }
}

export function writeWorkspaceStorage(workspace: PersistedWorkspace) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    WORKSPACE_STORAGE_KEY,
    JSON.stringify(workspace),
  );
}

export function buildSelectedVideo(
  transcript: TranscriptPayload,
): SelectedVideo {
  return {
    videoId: transcript.videoId,
    title: transcript.title,
    canonicalUrl: transcript.canonicalUrl,
    authorName: transcript.authorName,
    thumbnailUrl: transcript.thumbnailUrl,
  };
}

export function mergeProviderMap(
  input: unknown,
  fallback: ProviderMap,
): ProviderMap {
  if (!input || typeof input !== "object") {
    return fallback;
  }

  const record = input as Partial<Record<AssistantProvider, unknown>>;

  return {
    openai: typeof record.openai === "string" ? record.openai : fallback.openai,
    anthropic:
      typeof record.anthropic === "string" ? record.anthropic : fallback.anthropic,
    google: typeof record.google === "string" ? record.google : fallback.google,
  };
}

export function coerceDocumentState(
  input: unknown,
): GeneratedDocumentState {
  if (!input || typeof input !== "object") {
    return createIdleDocumentState();
  }

  const record = input as Partial<Record<keyof GeneratedDocumentState, unknown>>;
  const status =
    record.status === "idle" ||
    record.status === "loading" ||
    record.status === "loaded" ||
    record.status === "error"
      ? record.status
      : "idle";

  return {
    status: status === "loading" ? "idle" : status,
    content: typeof record.content === "string" ? record.content : "",
    error: typeof record.error === "string" ? record.error : "",
  };
}

export function buildScriptSections(
  segments: TranscriptSegment[],
  maxSegments = 8,
  maxDurationSeconds = 140,
): ScriptSection[] {
  if (segments.length === 0) {
    return [];
  }

  const sections: ScriptSection[] = [];
  let buffer: TranscriptSegment[] = [];

  const flush = () => {
    if (buffer.length === 0) {
      return;
    }

    const start = buffer[0].start;
    const end = buffer[buffer.length - 1].end;
    sections.push({
      id: `${sections.length + 1}-${start}`,
      label: `${formatTimestamp(start)}-${formatTimestamp(end)}`,
      start,
      end,
      segments: buffer,
    });
    buffer = [];
  };

  for (const segment of segments) {
    if (buffer.length === 0) {
      buffer.push(segment);
      continue;
    }

    const duration = segment.end - buffer[0].start;

    if (buffer.length >= maxSegments || duration > maxDurationSeconds) {
      flush();
    }

    buffer.push(segment);
  }

  flush();

  return sections;
}

export function parseStructuredText(content: string): StructuredBlock[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("## ")) {
        return {
          type: "heading" as const,
          value: line.slice(3).trim(),
        };
      }

      if (line.startsWith("- ")) {
        return {
          type: "bullet" as const,
          value: line.slice(2).trim(),
        };
      }

      return {
        type: "paragraph" as const,
        value: line,
      };
    });
}

export function splitDetailSections(content: string) {
  const lines = content.split("\n");
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = "Detailed Notes";
  let currentBody: string[] = [];

  const flush = () => {
    if (currentBody.length === 0) {
      return;
    }

    sections.push({
      title: currentTitle,
      body: currentBody.join("\n").trim(),
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("## ")) {
      flush();
      currentTitle = line.slice(3).trim();
      currentBody = [];
      continue;
    }

    currentBody.push(rawLine);
  }

  flush();

  return sections.length > 0
    ? sections
    : [
        {
          title: "Detailed Notes",
          body: content.trim(),
        },
      ];
}

function isAssistantMessage(value: unknown): value is AssistantMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<AssistantMessage>;
  return (
    (record.role === "user" || record.role === "assistant") &&
    typeof record.content === "string"
  );
}
