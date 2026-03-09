import type { AssistantMessage, AssistantProvider } from "@/lib/contracts";

interface GenerateTextInput {
  provider: AssistantProvider;
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AssistantMessage[];
  maxOutputTokens?: number;
}

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

interface AnthropicMessageResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
}

interface GoogleGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export async function generateText({
  provider,
  apiKey,
  model,
  systemPrompt,
  messages,
  maxOutputTokens = 1400,
}: GenerateTextInput): Promise<string> {
  switch (provider) {
    case "openai":
      return generateWithOpenAI({ apiKey, model, systemPrompt, messages });
    case "anthropic":
      return generateWithAnthropic({
        apiKey,
        model,
        systemPrompt,
        messages,
        maxOutputTokens,
      });
    case "google":
      return generateWithGoogle({
        apiKey,
        model,
        systemPrompt,
        messages,
        maxOutputTokens,
      });
    default:
      throw new Error("Unsupported provider.");
  }
}

async function generateWithOpenAI(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AssistantMessage[];
}): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: input.systemPrompt },
        ...input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    }),
  });

  const data = await parseJsonResponse<OpenAIChatCompletionResponse>(response);
  const content = normalizeOpenAIContent(data?.choices?.[0]?.message?.content);

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return content;
}

async function generateWithAnthropic(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AssistantMessage[];
  maxOutputTokens: number;
}): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: input.model,
      system: input.systemPrompt,
      max_tokens: input.maxOutputTokens,
      messages: input.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }),
  });

  const data = await parseJsonResponse<AnthropicMessageResponse>(response);
  const content = Array.isArray(data?.content)
    ? data.content
        .map((block: { type?: string; text?: string }) =>
          block.type === "text" ? block.text ?? "" : "",
        )
        .join("\n")
        .trim()
    : "";

  if (!content) {
    throw new Error("Claude returned an empty response.");
  }

  return content;
}

async function generateWithGoogle(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AssistantMessage[];
  maxOutputTokens: number;
}): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    input.model,
  )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: input.systemPrompt }],
      },
      contents: input.messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: input.maxOutputTokens,
      },
    }),
  });

  const data = await parseJsonResponse<GoogleGenerateContentResponse>(response);
  const content = Array.isArray(data?.candidates)
    ? data.candidates
        .flatMap((candidate: { content?: { parts?: Array<{ text?: string }> } }) =>
          candidate.content?.parts ?? [],
        )
        .map((part: { text?: string }) => part.text ?? "")
        .join("\n")
        .trim()
    : "";

  if (!content) {
    throw new Error("Google returned an empty response.");
  }

  return content;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? safeJsonParse<T>(text) : null;

  if (!response.ok) {
    const message = extractErrorMessage(data, text);
    throw new Error(message || "The provider request failed.");
  }

  return data as T;
}

function normalizeOpenAIContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item) {
          return typeof item.text === "string" ? item.text : "";
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const record = data as {
    error?: { message?: string; details?: Array<{ message?: string }> };
    message?: string;
  };

  return (
    record.error?.message ??
    record.error?.details?.[0]?.message ??
    record.message ??
    fallback
  );
}
