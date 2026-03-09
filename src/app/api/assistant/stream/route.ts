import type {
  AssistantMessage,
  AssistantProvider,
  SourcePreview,
} from "@/lib/contracts";
import { generateTextStream } from "@/lib/llm";
import {
  buildTranscriptChunks,
  formatTimestamp,
  pickRelevantChunks,
  splitTranscriptText,
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
    const instruction =
      typeof body?.instruction === "string" ? body.instruction.trim() : "";
    const language =
      typeof body?.language === "string" ? body.language.trim() : "";
    const transcript =
      typeof body?.transcript === "string" ? body.transcript.trim() : "";
    const segments = sanitizeSegments(body?.segments);
    const question =
      typeof body?.question === "string" ? body.question.trim() : "";
    const history = sanitizeMessages(body?.messages);

    if (!provider || !apiKey || !model) {
      return new Response(
        JSON.stringify({ error: "Provider, API key, and model are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Ask a question to start the transcript chat." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!transcript && segments.length === 0) {
      return new Response(
        JSON.stringify({ error: "Load a transcript before starting the chat." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Build chunks and pick relevant ones
    const chunks =
      segments.length > 0
        ? buildTranscriptChunks(segments, 2600)
        : splitTranscriptText(transcript, 2600).map((chunk, index) => ({
            id: index + 1,
            start: 0,
            end: 0,
            label: `Chunk ${index + 1}`,
            text: chunk,
            searchText: chunk.toLowerCase(),
          }));

    const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);
    const retrievalQuery = [
      question,
      ...trimmedHistory.map((m) => m.content),
    ].join(" ");
    const relevantChunks = pickRelevantChunks(chunks, retrievalQuery, 6);

    const sources: SourcePreview[] = relevantChunks.map((chunk) => ({
      label: chunk.label,
      excerpt: truncate(chunk.text, 240),
      start: chunk.start,
      end: chunk.end,
    }));

    const systemPrompt = `You are an assistant inside a transcript reading workspace.

Rules:
- Answer only from the provided transcript evidence.
- If the evidence is missing, say so directly.
- Reply in ${language || "the same language as the transcript"}. If the user writes in a different language, reply in the user's language.
- Cite timestamps like [05:12] when you make a concrete claim.
- Prefer direct structure over fluff.
- Do NOT use markdown bold (**text**). Use plain text only.
${instruction ? `- Follow this extra instruction when possible: ${instruction}` : ""}`;

    const llmMessages = [
      ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user" as const,
        content: `Transcript evidence:\n${relevantChunks
          .map((chunk) => `${chunk.label}\n${chunk.text}`)
          .join("\n\n")}\n\nQuestion:\n${question}`,
      },
    ];

    // Create a ReadableStream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send sources first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`),
        );

        try {
          await generateTextStream({
            provider,
            apiKey,
            model,
            systemPrompt,
            messages: llmMessages,
            onChunk: (text) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`),
              );
            },
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Stream failed.",
              })}\n\n`,
            ),
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "The AI request failed.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

function sanitizeProvider(value: unknown): AssistantProvider | null {
  return value === "openai" || value === "anthropic" || value === "google"
    ? value
    : null;
}

function sanitizeMessages(value: unknown): AssistantMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const role = r.role === "user" || r.role === "assistant" ? r.role : null;
      const content = typeof r.content === "string" ? r.content.trim() : "";
      if (!role || !content) return null;
      return { role, content };
    })
    .filter((item): item is AssistantMessage => item !== null);
}

function sanitizeSegments(value: unknown): TranscriptSegment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const text = typeof r.text === "string" ? r.text.trim() : "";
      const start = Number(r.start);
      const duration = Number(r.duration);
      const end = Number.isFinite(Number(r.end)) ? Number(r.end) : start + duration;
      if (!text || !Number.isFinite(start) || !Number.isFinite(duration)) return null;
      return {
        text,
        start,
        duration,
        end,
        timestamp:
          typeof r.timestamp === "string" && r.timestamp.trim()
            ? r.timestamp
            : formatTimestamp(start),
      };
    })
    .filter((item): item is TranscriptSegment => item !== null);
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}
