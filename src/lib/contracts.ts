import type { TranscriptSegment } from "@/lib/youtube";

export type AssistantProvider = "openai" | "anthropic" | "google";

export interface TranscriptLanguageOption {
  code: string;
  label: string;
  isGenerated: boolean;
  isTranslatable: boolean;
}

export interface TranscriptStats {
  segmentCount: number;
  durationSeconds: number;
  wordCount: number;
  characterCount: number;
}

export interface TranscriptPayload {
  videoId: string;
  canonicalUrl: string;
  title: string | null;
  authorName: string | null;
  thumbnailUrl: string | null;
  language: {
    code: string;
    label: string;
    isGenerated: boolean;
  };
  availableLanguages: TranscriptLanguageOption[];
  stats: TranscriptStats;
  transcript: string;
  timestampedTranscript: string;
  segments: TranscriptSegment[];
}

export interface SourcePreview {
  label: string;
  excerpt: string;
  start: number;
  end: number;
}

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SourcePreview[];
}
