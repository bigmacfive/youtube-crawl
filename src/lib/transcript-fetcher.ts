/**
 * Pure JS/fetch transcript fetcher — no Python dependency.
 * Uses YouTube's innertube API (Android client) to get caption URLs,
 * then fetches and parses the XML transcript.
 * Works on Vercel and any Node.js runtime.
 */

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptLanguageOption {
  code: string;
  label: string;
  is_generated: boolean;
  is_translatable: boolean;
}

export interface TranscriptResult {
  video_id: string;
  language_code: string;
  language_label: string;
  is_generated: boolean;
  available_languages: TranscriptLanguageOption[];
  segments: TranscriptSegment[];
}

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: { simpleText?: string; runs?: Array<{ text: string }> };
  kind?: string; // "asr" means auto-generated
  isTranslatable?: boolean;
}

interface TranslationLanguage {
  languageCode: string;
  languageName: { simpleText?: string; runs?: Array<{ text: string }> };
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const INNERTUBE_CONTEXT = {
  client: { clientName: "ANDROID", clientVersion: "20.10.38" },
};

// Well-known innertube API key (public, used by all YouTube clients)
const FALLBACK_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

export async function fetchTranscript(payload: {
  videoId: string;
  languages: string[];
}): Promise<TranscriptResult> {
  const { videoId, languages } = payload;

  // 1. Try to get API key from watch page, fall back to well-known key
  let apiKey = FALLBACK_API_KEY;
  try {
    const html = await fetchWatchPage(videoId);
    const extractedKey = extractInnertubeApiKey(html);
    if (extractedKey) apiKey = extractedKey;
  } catch {
    // Watch page fetch failed (consent, blocking, etc.) — continue with fallback key
  }

  // 2. Call the innertube player API (Android client) to get caption URLs
  const playerData = await fetchInnertubePlayer(videoId, apiKey);

  // Check playability
  const playabilityStatus = playerData?.playabilityStatus;
  if (playabilityStatus) {
    const status = playabilityStatus.status;
    if (status === "ERROR") {
      throw new Error(
        playabilityStatus.reason || `Video ${videoId} is unavailable.`,
      );
    }
    if (status === "LOGIN_REQUIRED") {
      const reason = playabilityStatus.reason || "";
      if (reason.includes("bot")) {
        throw new Error(
          "YouTube is blocking this request. Try again later.",
        );
      }
      throw new Error(
        reason || "This video requires login to access.",
      );
    }
  }

  const captionsData = playerData?.captions?.playerCaptionsTracklistRenderer;
  if (!captionsData || !captionsData.captionTracks?.length) {
    throw new Error(
      "No captions are available for this video. The video may not have subtitles enabled.",
    );
  }

  const captionTracks: CaptionTrack[] = captionsData.captionTracks;

  // 3. Build available languages list
  const availableLanguages: TranscriptLanguageOption[] = captionTracks.map(
    (track: CaptionTrack) => ({
      code: track.languageCode,
      label: extractTrackLabel(track),
      is_generated: track.kind === "asr",
      is_translatable: track.isTranslatable ?? false,
    }),
  );

  // 4. Pick the best caption track
  const selected = pickTrack(captionTracks, languages);

  // 5. Build fetch URL (strip fmt=srv3, add translation if needed)
  let fetchUrl = selected.track.baseUrl.replace("&fmt=srv3", "");
  if (selected.translateTo) {
    fetchUrl = `${fetchUrl}&tlang=${selected.translateTo}`;
  }

  // 6. Fetch and parse the transcript
  const segments = await fetchAndParseTranscript(fetchUrl);

  const translationLanguages: TranslationLanguage[] =
    captionsData.translationLanguages ?? [];
  const isGenerated = selected.track.kind === "asr";
  const langCode = selected.translateTo || selected.track.languageCode;
  const langLabel = selected.translateTo
    ? findTranslationLabel(translationLanguages, selected.translateTo) ||
      langCode
    : extractTrackLabel(selected.track);

  return {
    video_id: videoId,
    language_code: langCode,
    language_label: langLabel,
    is_generated: isGenerated,
    available_languages: availableLanguages,
    segments,
  };
}

async function fetchWatchPage(videoId: string): Promise<string> {
  const response = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=PENDING+987",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch YouTube page (status ${response.status}).`,
    );
  }

  const html = await response.text();

  // Check for consent page
  if (html.includes('action="https://consent.youtube.com/s"')) {
    // Extract consent value and retry
    const consentMatch = html.match(/name="v"\s+value="([^"]+)"/);
    if (consentMatch) {
      const retryResponse = await fetch(
        `https://www.youtube.com/watch?v=${videoId}`,
        {
          headers: {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
            Cookie: `CONSENT=YES+${consentMatch[1]}`,
          },
        },
      );
      if (retryResponse.ok) {
        return retryResponse.text();
      }
    }
  }

  return html;
}

function extractInnertubeApiKey(html: string): string | null {
  const match = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
  return match?.[1] ?? null;
}

async function fetchInnertubePlayer(
  videoId: string,
  apiKey: string,
): Promise<InnertubePlayerResponse> {
  const response = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        context: INNERTUBE_CONTEXT,
        videoId,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `YouTube API request failed (status ${response.status}).`,
    );
  }

  return response.json() as Promise<InnertubePlayerResponse>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InnertubePlayerResponse = {
  captions?: { playerCaptionsTracklistRenderer?: any };
  playabilityStatus?: { status?: string; reason?: string };
  [k: string]: any;
};

function extractTrackLabel(track: CaptionTrack): string {
  if (track.name?.simpleText) return track.name.simpleText;
  if (track.name?.runs?.length)
    return track.name.runs.map((r) => r.text).join("");
  return track.languageCode;
}

function findTranslationLabel(
  translationLanguages: TranslationLanguage[],
  code: string,
): string | null {
  for (const tl of translationLanguages) {
    if (tl.languageCode === code) {
      if (tl.languageName?.simpleText) return tl.languageName.simpleText;
      if (tl.languageName?.runs?.length)
        return tl.languageName.runs.map((r) => r.text).join("");
    }
  }
  return null;
}

function pickTrack(
  tracks: CaptionTrack[],
  preferredLanguages: string[],
): { track: CaptionTrack; translateTo?: string } {
  if (preferredLanguages.length > 0) {
    for (const lang of preferredLanguages) {
      const exact = tracks.find((t) => t.languageCode === lang);
      if (exact) return { track: exact };
    }
    for (const lang of preferredLanguages) {
      const translatable = tracks.find((t) => t.isTranslatable);
      if (translatable) return { track: translatable, translateTo: lang };
    }
  }
  // Prefer manual over auto-generated
  const manual = tracks.find((t) => t.kind !== "asr");
  return { track: manual || tracks[0] };
}

async function fetchAndParseTranscript(
  url: string,
): Promise<TranscriptSegment[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch transcript data (status ${response.status}).`,
    );
  }

  const xml = await response.text();
  return parseTranscriptXml(xml);
}

function parseTranscriptXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const textRegex =
    /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = textRegex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ""));

    if (text.trim()) {
      segments.push({ text, start, duration });
    }
  }

  return segments;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/\n/g, " ");
}
