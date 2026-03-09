/**
 * Pure JS/fetch transcript fetcher — no Python dependency.
 * Uses innertube API with multiple client strategies.
 * ANDROID client returns caption URLs without exp=xpe restriction.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlayerResponse = {
  captions?: { playerCaptionsTracklistRenderer?: any };
  playabilityStatus?: { status?: string; reason?: string };
  [k: string]: any;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const ANDROID_UA =
  "com.google.android.youtube/19.29.37 (Linux; U; Android 14) gzip";

const FALLBACK_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

export async function fetchTranscript(payload: {
  videoId: string;
  languages: string[];
}): Promise<TranscriptResult> {
  const { videoId, languages } = payload;

  // Get visitorData from YouTube homepage (helps avoid bot detection)
  let visitorData: string | null = null;
  try {
    visitorData = await getVisitorData();
  } catch {
    // Continue without visitorData
  }

  // Try multiple strategies — ANDROID first (clean URLs without exp=xpe)
  const strategies: Array<{
    name: string;
    fn: () => Promise<PlayerResponse | null>;
  }> = [
    {
      name: "ANDROID",
      fn: () =>
        fetchInnertubePlayer(videoId, {
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "19.29.37",
              androidSdkVersion: 34,
              hl: "en",
              gl: "US",
              ...(visitorData ? { visitorData } : {}),
            },
          },
          userAgent: ANDROID_UA,
        }),
    },
    {
      name: "ANDROID_EMBEDDED",
      fn: () =>
        fetchInnertubePlayer(videoId, {
          context: {
            client: {
              clientName: "ANDROID_EMBEDDED_PLAYER",
              clientVersion: "19.29.37",
              androidSdkVersion: 34,
              hl: "en",
              gl: "US",
              ...(visitorData ? { visitorData } : {}),
            },
            thirdParty: { embedUrl: "https://www.google.com/" },
          },
          userAgent: ANDROID_UA,
        }),
    },
    {
      name: "WEB",
      fn: () =>
        fetchInnertubePlayer(videoId, {
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20241126.01.00",
              hl: "en",
              gl: "US",
              ...(visitorData ? { visitorData } : {}),
            },
          },
          userAgent: USER_AGENT,
        }),
    },
  ];

  let playerData: PlayerResponse | null = null;
  let lastError: string | null = null;

  for (const strategy of strategies) {
    try {
      const result = await strategy.fn();
      if (!result) continue;

      // Hard error — stop trying
      const status = result.playabilityStatus?.status;
      if (status === "ERROR") {
        throw new Error(
          result.playabilityStatus?.reason ||
            `Video ${videoId} is unavailable.`,
        );
      }

      // Got captions — use this result
      if (hasCaptions(result)) {
        playerData = result;
        break;
      }

      // LOGIN_REQUIRED or no captions — try next strategy
      if (status === "LOGIN_REQUIRED") {
        lastError =
          result.playabilityStatus?.reason ||
          "YouTube is requiring login for this video.";
        continue;
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("unavailable")
      ) {
        throw err; // Re-throw hard errors
      }
      lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  if (!playerData || !hasCaptions(playerData)) {
    throw new Error(
      lastError ||
        "Could not retrieve captions from YouTube. The video may not have subtitles enabled.",
    );
  }

  const captionsData = playerData.captions!.playerCaptionsTracklistRenderer!;
  const captionTracks: CaptionTrack[] = captionsData.captionTracks;

  const availableLanguages: TranscriptLanguageOption[] = captionTracks.map(
    (track: CaptionTrack) => ({
      code: track.languageCode,
      label: extractTrackLabel(track),
      is_generated: track.kind === "asr",
      is_translatable: track.isTranslatable ?? false,
    }),
  );

  const selected = pickTrack(captionTracks, languages);

  let fetchUrl = selected.track.baseUrl.replace("&fmt=srv3", "");
  if (selected.translateTo) {
    fetchUrl = `${fetchUrl}&tlang=${selected.translateTo}`;
  }

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

// ---------------------------------------------------------------------------
// Visitor data — helps avoid bot detection
// ---------------------------------------------------------------------------

async function getVisitorData(): Promise<string | null> {
  const response = await fetch(
    `https://www.youtube.com/youtubei/v1/visitor_id?key=${FALLBACK_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": ANDROID_UA,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "19.29.37",
          },
        },
      }),
    },
  );

  if (!response.ok) return null;
  const data = (await response.json()) as { responseContext?: { visitorData?: string } };
  return data?.responseContext?.visitorData ?? null;
}

// ---------------------------------------------------------------------------
// Innertube player API
// ---------------------------------------------------------------------------

async function fetchInnertubePlayer(
  videoId: string,
  opts: { context: Record<string, unknown>; userAgent: string },
): Promise<PlayerResponse | null> {
  const response = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${FALLBACK_API_KEY}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": opts.userAgent,
        "X-YouTube-Client-Name": "3",
        "X-YouTube-Client-Version": "19.29.37",
      },
      body: JSON.stringify({
        ...opts.context,
        videoId,
        playbackContext: {
          contentPlaybackContext: { html5Preference: "HTML5_PREF_WANTS" },
        },
        contentCheckOk: true,
        racyCheckOk: true,
      }),
    },
  );

  if (!response.ok) return null;
  return response.json() as Promise<PlayerResponse>;
}

function hasCaptions(data: PlayerResponse): boolean {
  return !!data.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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
  const manual = tracks.find((t) => t.kind !== "asr");
  return { track: manual || tracks[0] };
}

async function fetchAndParseTranscript(
  url: string,
): Promise<TranscriptSegment[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": ANDROID_UA },
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
