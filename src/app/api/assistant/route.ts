import { NextResponse } from "next/server";

import type {
  AssistantMessage,
  AssistantProvider,
  SourcePreview,
} from "@/lib/contracts";
import { generateText } from "@/lib/llm";
import {
  buildTranscriptChunks,
  formatTimestamp,
  pickRelevantChunks,
  splitTranscriptText,
  transcriptToTimestampedText,
  type TranscriptSegment,
} from "@/lib/youtube";

export const runtime = "nodejs";

const MAX_HISTORY_MESSAGES = 6;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = sanitizeProvider(body?.provider);
    const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
    const model = typeof body?.model === "string" ? body.model.trim() : "";
    const mode =
      body?.mode === "summary" || body?.mode === "detail" || body?.mode === "chat"
        ? body.mode
        : null;
    const instruction =
      typeof body?.instruction === "string" ? body.instruction.trim() : "";
    const language =
      typeof body?.language === "string" ? body.language.trim() : "";
    const transcript =
      typeof body?.transcript === "string" ? body.transcript.trim() : "";
    const segments = sanitizeSegments(body?.segments);

    if (!provider || !apiKey || !model || !mode) {
      return NextResponse.json(
        { error: "Provider, API key, model, and mode are required." },
        { status: 400 },
      );
    }

    if (mode === "summary" || mode === "detail") {
      const sourceText =
        transcript || transcriptToTimestampedText(segments as TranscriptSegment[]);

      if (!sourceText) {
        return NextResponse.json(
          { error: "Load a transcript before requesting AI output." },
          { status: 400 },
        );
      }

      const content =
        mode === "summary"
          ? await generateSummaryDocument({
              provider,
              apiKey,
              model,
              transcript: sourceText,
              instruction,
              language,
            })
          : await generateDetailDocument({
              provider,
              apiKey,
              model,
              transcript: sourceText,
              instruction,
              language,
            });

      return NextResponse.json({ content });
    }

    const question =
      typeof body?.question === "string" ? body.question.trim() : "";
    const history = sanitizeMessages(body?.messages);

    if (!question) {
      return NextResponse.json(
        { error: "Ask a question to start the transcript chat." },
        { status: 400 },
      );
    }

    if (!transcript && segments.length === 0) {
      return NextResponse.json(
        { error: "Load a transcript before starting the chat." },
        { status: 400 },
      );
    }

    const result = await answerTranscriptQuestion({
      provider,
      apiKey,
      model,
      instruction,
      language,
      question,
      history,
      segments,
      transcript,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The AI request failed.",
      },
      { status: 500 },
    );
  }
}

async function generateSummaryDocument(input: {
  provider: AssistantProvider;
  apiKey: string;
  model: string;
  transcript: string;
  instruction: string;
  language: string;
}) {
  const lang = input.language || "the same language as the transcript";
  return generateTranscriptDocument({
    ...input,
    chunkMaxLength: 11000,
    chunkInstruction:
      `Extract the core claims, evidence, and timestamps from this transcript chunk. Be factual and concise. Write in ${lang}.`,
    mergeInstruction: `You are a transcript summarizer. Produce a structured summary.

IMPORTANT: Write the entire output in ${lang}.

Format (follow exactly):

TL;DR
One paragraph, 2-3 sentences max. State the subject, the core argument, and the conclusion.

## Key Points
- Each bullet: one concrete claim or finding. 4-6 bullets.
- Include a timestamp [MM:SS] per bullet when possible.

## Timeline
- [MM:SS] What happens at this point — one line per entry
- Cover the major segments of the video chronologically

## Takeaway
One paragraph. What should the reader remember or do after watching this?

Rules:
- No markdown bold. Plain text only.
- No filler phrases like "In this video" or "The speaker discusses".
- Every claim must be grounded in the transcript.
- Be direct. Cut fluff.`,
    maxOutputTokens: 1000,
  });
}

async function generateDetailDocument(input: {
  provider: AssistantProvider;
  apiKey: string;
  model: string;
  transcript: string;
  instruction: string;
  language: string;
}) {
  const lang = input.language || "the same language as the transcript";
  return generateTranscriptDocument({
    ...input,
    chunkMaxLength: 9000,
    chunkInstruction:
      `Analyze this transcript chunk: extract themes, arguments, evidence, notable quotes, and timestamps. Write in ${lang}.`,
    mergeInstruction: `You are a transcript analyst. Produce a detailed reading companion.

IMPORTANT: Write the entire output in ${lang}.

Format (follow exactly):

## Overview
2 short paragraphs. What is this about? What is the speaker's position? What is the context?

## Core Themes
For each theme:
### [Theme Name]
- Explanation with timestamps [MM:SS]
- Key evidence or examples mentioned

## Notable Statements
- "[Quote or close paraphrase]" [MM:SS] — brief context of why it matters
- 4-8 statements total

## Detailed Timeline
- [MM:SS-MM:SS] Topic/section heading: what is covered in this segment
- Cover the full video chronologically

## Takeaways
- Actionable or memorable points, one per bullet
- Only include what the transcript actually supports

Rules:
- No markdown bold. Plain text only.
- No filler phrases.
- Every claim grounded in transcript evidence.
- Use direct, analytical tone.`,
    maxOutputTokens: 1800,
  });
}

async function generateTranscriptDocument(input: {
  provider: AssistantProvider;
  apiKey: string;
  model: string;
  transcript: string;
  instruction: string;
  chunkInstruction: string;
  mergeInstruction: string;
  chunkMaxLength: number;
  maxOutputTokens: number;
}) {
  const chunks = splitTranscriptText(input.transcript, input.chunkMaxLength);
  const extraInstruction = input.instruction
    ? `Extra instruction: ${input.instruction}`
    : "Extra instruction: stay grounded in the transcript and cite timestamps when helpful.";

  if (chunks.length === 1) {
    return generateText({
      provider: input.provider,
      apiKey: input.apiKey,
      model: input.model,
      maxOutputTokens: input.maxOutputTokens,
      systemPrompt:
        "You transform YouTube transcripts into structured reader-friendly documents. Work only from the supplied transcript.",
      messages: [
        {
          role: "user",
          content: `${input.mergeInstruction}

${extraInstruction}

Transcript:
${chunks[0]}`,
        },
      ],
    });
  }

  const chunkOutputs: string[] = [];

  for (const [index, chunk] of chunks.entries()) {
    const content = await generateText({
      provider: input.provider,
      apiKey: input.apiKey,
      model: input.model,
      maxOutputTokens: 850,
      systemPrompt:
        "You compress one transcript chunk into structured notes that can later be merged into a final document.",
      messages: [
        {
          role: "user",
          content: `Chunk ${index + 1} of ${chunks.length}.

${input.chunkInstruction}

${extraInstruction}

Transcript chunk:
${chunk}`,
        },
      ],
    });

    chunkOutputs.push(`Chunk ${index + 1}\n${content}`);
  }

  return generateText({
    provider: input.provider,
    apiKey: input.apiKey,
    model: input.model,
    maxOutputTokens: input.maxOutputTokens,
    systemPrompt:
      "You merge transcript chunk notes into one coherent document for a reader.",
    messages: [
      {
        role: "user",
        content: `${input.mergeInstruction}

${extraInstruction}

Chunk notes:
${chunkOutputs.join("\n\n")}`,
      },
    ],
  });
}

async function answerTranscriptQuestion(input: {
  provider: AssistantProvider;
  apiKey: string;
  model: string;
  instruction: string;
  language: string;
  question: string;
  history: AssistantMessage[];
  segments: TranscriptSegment[];
  transcript: string;
}) {
  const chunks =
    input.segments.length > 0
      ? buildTranscriptChunks(input.segments, 2600)
      : splitTranscriptText(input.transcript, 2600).map((chunk, index) => ({
          id: index + 1,
          start: 0,
          end: 0,
          label: `Chunk ${index + 1}`,
          text: chunk,
          searchText: chunk.toLowerCase(),
        }));

  const history = input.history.slice(-MAX_HISTORY_MESSAGES);
  const retrievalQuery = [
    input.question,
    ...history.map((message) => message.content),
  ].join(" ");
  const relevantChunks = pickRelevantChunks(chunks, retrievalQuery, 6);

  const sources: SourcePreview[] = relevantChunks.map((chunk) => ({
    label: chunk.label,
    excerpt: truncate(chunk.text, 240),
    start: chunk.start,
    end: chunk.end,
  }));

  const content = await generateText({
    provider: input.provider,
    apiKey: input.apiKey,
    model: input.model,
    systemPrompt: `Transcript Q&A assistant. Answer from the transcript only.

Rules:
- Cite timestamps [MM:SS] for every factual claim.
- If the transcript doesn't cover it, say "transcript에 해당 내용 없음" (or equivalent in the reply language) and stop.
- Reply in ${input.language || "the same language as the transcript"}. Match the user's language if different.
- 1-4 sentences per answer unless the question asks for a list.
- No markdown bold. No filler. No "Great question!" openers.
- Start with the answer, not context.
${input.instruction ? `- Extra instruction: ${input.instruction}` : ""}`,
    messages: [
      ...history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        role: "user",
        content: `Transcript evidence:
${relevantChunks
  .map((chunk) => `${chunk.label}\n${chunk.text}`)
  .join("\n\n")}

Question:
${input.question}`,
      },
    ],
  });

  return { content, sources };
}

function sanitizeProvider(value: unknown): AssistantProvider | null {
  return value === "openai" || value === "anthropic" || value === "google"
    ? value
    : null;
}

function sanitizeMessages(value: unknown): AssistantMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const role =
        record.role === "user" || record.role === "assistant"
          ? record.role
          : null;
      const content =
        typeof record.content === "string" ? record.content.trim() : "";

      if (!role || !content) {
        return null;
      }

      return { role, content };
    })
    .filter((item): item is AssistantMessage => item !== null);
}

function sanitizeSegments(value: unknown): TranscriptSegment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const text = typeof record.text === "string" ? record.text.trim() : "";
      const start = Number(record.start);
      const duration = Number(record.duration);
      const end = Number.isFinite(Number(record.end))
        ? Number(record.end)
        : start + duration;

      if (!text || !Number.isFinite(start) || !Number.isFinite(duration)) {
        return null;
      }

      return {
        text,
        start,
        duration,
        end,
        timestamp:
          typeof record.timestamp === "string" && record.timestamp.trim()
            ? record.timestamp
            : formatTimestamp(start),
      };
    })
    .filter((item): item is TranscriptSegment => item !== null);
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}
