/**
 * Pure JS/fetch transcript fetcher — no Python dependency.
 * Primary: extracts captions from the watch page's embedded player response.
 * Fallback: uses innertube API with WEB client context.
 * Works locally and on Vercel.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlayerResponse = {
  captions?: { playerCaptionsTracklistRenderer?: any };
  playabilityStatus?: { status?: string; reason?: string };
  [k: string]: any;
};

export async function fetchTranscript(payload: {
  videoId: string;
  languages: string[];
}): Promise<TranscriptResult> {
  const { videoId, languages } = payload;

  // Strategy 1: Extract captions directly from watch page HTML
  // This avoids a separate API call and works from any IP
  let playerData: PlayerResponse | null = null;

  try {
    const html = await fetchWatchPage(videoId);
    playerData = extractPlayerResponse(html);
  } catch {
    // Watch page extraction failed — try fallback
  }

  // Strategy 2: Innertube API with WEB client (fallback)
  if (!playerData || !hasCaptions(playerData)) {
    try {
      playerData = await fetchInnertubePlayer(videoId);
    } catch {
      // Both strategies failed
    }
  }

  if (!playerData) {
    throw new Error(
      "Could not retrieve video data from YouTube. Try a different video or try again later.",
    );
  }

  // Check playability
  const playabilityStatus = playerData.playabilityStatus;
  if (playabilityStatus) {
    const status = playabilityStatus.status;
    if (status === "ERROR") {
      throw new Error(
        playabilityStatus.reason || `Video ${videoId} is unavailable.`,
      );
    }
    if (status === "LOGIN_REQUIRED") {
      throw new Error(
        playabilityStatus.reason || "This video requires login to access.",
      );
    }
  }

  const captionsData = playerData.captions?.playerCaptionsTracklistRenderer;
  if (!captionsData || !captionsData.captionTracks?.length) {
    throw new Error(
      "No captions are available for this video. The video may not have subtitles enabled.",
    );
  }

  const captionTracks: CaptionTrack[] = captionsData.captionTracks;

  // Build available languages list
  const availableLanguages: TranscriptLanguageOption[] = captionTracks.map(
    (track: CaptionTrack) => ({
      code: track.languageCode,
      label: extractTrackLabel(track),
      is_generated: track.kind === "asr",
      is_translatable: track.isTranslatable ?? false,
    }),
  );

  // Pick the best caption track
  const selected = pickTrack(captionTracks, languages);

  // Build fetch URL (strip fmt=srv3, add translation if needed)
  let fetchUrl = selected.track.baseUrl.replace("&fmt=srv3", "");
  if (selected.translateTo) {
    fetchUrl = `${fetchUrl}&tlang=${selected.translateTo}`;
  }

  // Fetch and parse the transcript XML
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
// Watch page fetch + embedded player response extraction
// ---------------------------------------------------------------------------

async function fetchWatchPage(videoId: string): Promise<string> {
  const response = await fetch(
    `https://www.youtube.com/watch?v=${videoId}&hl=en`,
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

  // Handle consent redirect
  if (html.includes('action="https://consent.youtube.com/s"')) {
    const consentMatch = html.match(/name="v"\s+value="([^"]+)"/);
    if (consentMatch) {
      const retryResponse = await fetch(
        `https://www.youtube.com/watch?v=${videoId}&hl=en`,
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

/**
 * Extract ytInitialPlayerResponse from watch page HTML.
 * YouTube embeds the full player response as a JS variable in the page.
 */
function extractPlayerResponse(html: string): PlayerResponse | null {
  // Pattern 1: var ytInitialPlayerResponse = {...};
  const varMatch = html.match(
    new RegExp(
      'var\\s+ytInitialPlayerResponse\\s*=\\s*(\\{.+?\\});\\s*(?:var|</script>)',
      's',
    ),
  );
  if (varMatch) {
    try {
      return JSON.parse(varMatch[1]) as PlayerResponse;
    } catch {
      // JSON parse failed, try next pattern
    }
  }

  // Pattern 2: ytInitialPlayerResponse = JSON.parse('...')
  // YouTube sometimes uses this with escaped JSON
  const parseMatch = html.match(
    new RegExp(
      "ytInitialPlayerResponse\\s*=\\s*JSON\\.parse\\('(.+?)'\\)",
      's',
    ),
  );
  if (parseMatch) {
    try {
      // Unescape the string (\\x22 → ", etc.)
      const unescaped = parseMatch[1]
        .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16)),
        )
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      return JSON.parse(unescaped) as PlayerResponse;
    } catch {
      // Parse failed
    }
  }

  // Pattern 3: window["ytInitialPlayerResponse"]
  const windowMatch = html.match(
    new RegExp(
      'window\\["ytInitialPlayerResponse"\\]\\s*=\\s*(\\{.+?\\});\\s*(?:window|</script>)',
      's',
    ),
  );
  if (windowMatch) {
    try {
      return JSON.parse(windowMatch[1]) as PlayerResponse;
    } catch {
      // Parse failed
    }
  }

  return null;
}

function hasCaptions(data: PlayerResponse): boolean {
  return !!data.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length;
}

// ---------------------------------------------------------------------------
// Innertube API fallback (WEB client — less likely to be blocked than ANDROID)
// ---------------------------------------------------------------------------

const INNERTUBE_WEB_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20241126.01.00",
    hl: "en",
    gl: "US",
  },
};

const FALLBACK_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

async function fetchInnertubePlayer(
  videoId: string,
): Promise<PlayerResponse> {
  const response = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${FALLBACK_API_KEY}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/",
      },
      body: JSON.stringify({
        context: INNERTUBE_WEB_CONTEXT,
        videoId,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `YouTube API request failed (status ${response.status}).`,
    );
  }

  return response.json() as Promise<PlayerResponse>;
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
