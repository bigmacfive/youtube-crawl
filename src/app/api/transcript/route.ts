import { NextResponse } from "next/server";

import type { TranscriptPayload } from "@/lib/contracts";
import { fetchTranscriptWithPython } from "@/lib/python";
import {
  canonicalYoutubeUrl,
  countWords,
  decorateSegments,
  extractVideoId,
  transcriptToPlainText,
  transcriptToTimestampedText,
} from "@/lib/youtube";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const preferredLanguage =
      typeof body?.language === "string" ? body.language.trim().toLowerCase() : "";

    if (!url) {
      return NextResponse.json(
        { error: "Paste a YouTube URL or a video id." },
        { status: 400 },
      );
    }

    const videoId = extractVideoId(url);

    if (!videoId) {
      return NextResponse.json(
        { error: "That does not look like a valid YouTube URL." },
        { status: 400 },
      );
    }

    const canonicalUrl = canonicalYoutubeUrl(videoId);

    const [transcriptResult, metadata] = await Promise.all([
      fetchTranscriptWithPython({
        videoId,
        languages: preferredLanguage ? [preferredLanguage] : [],
      }),
      fetchYoutubeMetadata(canonicalUrl),
    ]);

    const segments = decorateSegments(transcriptResult.segments);

    if (segments.length === 0) {
      return NextResponse.json(
        { error: "No transcript was returned for this video." },
        { status: 404 },
      );
    }

    const transcript = transcriptToPlainText(segments);
    const timestampedTranscript = transcriptToTimestampedText(segments);

    const payload: TranscriptPayload = {
      videoId,
      canonicalUrl,
      title: metadata?.title ?? null,
      authorName: metadata?.authorName ?? null,
      thumbnailUrl: metadata?.thumbnailUrl ?? null,
      language: {
        code: transcriptResult.language_code,
        label: transcriptResult.language_label,
        isGenerated: transcriptResult.is_generated,
      },
      availableLanguages: transcriptResult.available_languages.map((language) => ({
        code: language.code,
        label: language.label,
        isGenerated: language.is_generated,
        isTranslatable: language.is_translatable,
      })),
      stats: {
        segmentCount: segments.length,
        durationSeconds: segments.at(-1)?.end ?? 0,
        wordCount: countWords(transcript),
        characterCount: transcript.length,
      },
      transcript,
      timestampedTranscript,
      segments,
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve the transcript.",
      },
      { status: 500 },
    );
  }
}

async function fetchYoutubeMetadata(canonicalUrl: string) {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        canonicalUrl,
      )}&format=json`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    return {
      title: typeof data.title === "string" ? data.title : null,
      authorName:
        typeof data.author_name === "string" ? data.author_name : null,
      thumbnailUrl:
        typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
    };
  } catch {
    return null;
  }
}
