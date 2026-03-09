const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "been",
  "being",
  "between",
  "could",
  "does",
  "from",
  "have",
  "into",
  "just",
  "more",
  "most",
  "only",
  "other",
  "over",
  "same",
  "some",
  "such",
  "than",
  "that",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "those",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&#x2F;": "/",
  "&#10;": "\n",
};

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
  end: number;
  timestamp: string;
}

export interface TranscriptChunk {
  id: number;
  start: number;
  end: number;
  label: string;
  text: string;
  searchText: string;
}

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  if (VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const attempts = [trimmed, `https://${trimmed.replace(/^\/+/, "")}`];

  for (const attempt of attempts) {
    try {
      const url = new URL(attempt);
      const host = url.hostname.replace(/^www\./, "");

      if (host === "youtu.be") {
        return sanitizeVideoId(url.pathname.split("/").filter(Boolean)[0] ?? "");
      }

      if (
        host.endsWith("youtube.com") ||
        host.endsWith("youtube-nocookie.com")
      ) {
        const direct = sanitizeVideoId(url.searchParams.get("v") ?? "");
        if (direct) {
          return direct;
        }

        const parts = url.pathname.split("/").filter(Boolean);
        const watchLikeIndex = parts.findIndex((part) =>
          ["embed", "shorts", "live", "v"].includes(part),
        );

        if (watchLikeIndex >= 0) {
          return sanitizeVideoId(parts[watchLikeIndex + 1] ?? "");
        }
      }
    } catch {}
  }

  const fallbackMatch = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/,
  );

  return fallbackMatch?.[1] ?? null;
}

export function canonicalYoutubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function decodeEntities(value: string): string {
  return value.replace(
    /&amp;|&lt;|&gt;|&quot;|&#39;|&#x27;|&#x2F;|&#10;/g,
    (entity) => ENTITY_MAP[entity] ?? entity,
  );
}

export function cleanTranscriptText(value: string): string {
  return decodeEntities(value)
    .replace(/\s+/g, " ")
    .trim();
}

export function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  }

  return [minutes, remainingSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function decorateSegments(
  rawSegments: Array<{ text: string; start: number; duration: number }>,
): TranscriptSegment[] {
  return rawSegments
    .map((segment) => {
      const cleanedText = cleanTranscriptText(segment.text);
      const start = Number(segment.start) || 0;
      const duration = Number(segment.duration) || 0;

      return {
        text: cleanedText,
        start,
        duration,
        end: start + duration,
        timestamp: formatTimestamp(start),
      };
    })
    .filter((segment) => segment.text.length > 0);
}

export function transcriptToPlainText(segments: TranscriptSegment[]): string {
  return segments.map((segment) => segment.text).join("\n");
}

export function transcriptToTimestampedText(
  segments: TranscriptSegment[],
): string {
  return segments
    .map((segment) => `[${segment.timestamp}] ${segment.text}`)
    .join("\n");
}

export function countWords(text: string): number {
  return text
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

export function buildTranscriptChunks(
  segments: TranscriptSegment[],
  maxCharacters = 2800,
): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  let pending: TranscriptSegment[] = [];
  let currentCharacters = 0;

  const flush = () => {
    if (pending.length === 0) {
      return;
    }

    const start = pending[0].start;
    const end = pending[pending.length - 1].end;
    const label = `${formatTimestamp(start)}-${formatTimestamp(end)}`;
    const text = pending
      .map((segment) => `[${segment.timestamp}] ${segment.text}`)
      .join("\n");

    chunks.push({
      id: chunks.length + 1,
      start,
      end,
      label,
      text,
      searchText: normalizeForSearch(text),
    });

    pending = [];
    currentCharacters = 0;
  };

  for (const segment of segments) {
    const line = `[${segment.timestamp}] ${segment.text}`;

    if (pending.length > 0 && currentCharacters + line.length > maxCharacters) {
      flush();
    }

    pending.push(segment);
    currentCharacters += line.length + 1;
  }

  flush();

  return chunks;
}

export function pickRelevantChunks(
  chunks: TranscriptChunk[],
  query: string,
  count = 4,
): TranscriptChunk[] {
  if (chunks.length <= count) {
    return chunks;
  }

  const normalizedQuery = normalizeForSearch(query);
  const queryTokens = tokenize(normalizedQuery);

  if (queryTokens.length === 0) {
    return chunks.slice(0, count);
  }

  const ranked = chunks
    .map((chunk) => {
      let score = 0;

      for (const token of queryTokens) {
        if (chunk.searchText.includes(token)) {
          score += token.length > 5 ? 3 : 2;
        }
      }

      if (
        normalizedQuery.length > 16 &&
        chunk.searchText.includes(normalizedQuery)
      ) {
        score += 6;
      }

      return { chunk, score };
    })
    .sort(
      (left, right) => right.score - left.score || left.chunk.id - right.chunk.id,
    );

  const selected = ranked
    .filter((item) => item.score > 0)
    .slice(0, count)
    .map((item) => item.chunk);

  if (selected.length === 0) {
    return chunks.slice(0, count);
  }

  return selected.sort((left, right) => left.start - right.start);
}

export function splitTranscriptText(
  value: string,
  maxCharacters = 12000,
): string[] {
  const lines = value.split("\n").filter(Boolean);
  const chunks: string[] = [];
  let pending = "";

  for (const line of lines) {
    if (pending.length > 0 && pending.length + line.length + 1 > maxCharacters) {
      chunks.push(pending);
      pending = line;
      continue;
    }

    pending = pending.length > 0 ? `${pending}\n${line}` : line;
  }

  if (pending.length > 0) {
    chunks.push(pending);
  }

  return chunks.length > 0 ? chunks : [value];
}

function sanitizeVideoId(candidate: string): string | null {
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

function normalizeForSearch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return value
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}
