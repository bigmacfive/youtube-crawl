import type { AssistantProvider } from "@/lib/contracts";

export const PROVIDERS: Record<
  AssistantProvider,
  {
    label: string;
    model: string;
    keyPlaceholder: string;
    detail: string;
  }
> = {
  openai: {
    label: "OpenAI",
    model: "gpt-5",
    keyPlaceholder: "sk-...",
    detail: "Use your own OpenAI key and model name.",
  },
  anthropic: {
    label: "Claude",
    model: "claude-sonnet-4-20250514",
    keyPlaceholder: "sk-ant-...",
    detail: "Anthropic Messages API through your local server.",
  },
  google: {
    label: "Google",
    model: "gemini-2.5-flash",
    keyPlaceholder: "AIza...",
    detail: "Gemini generateContent with your own API key.",
  },
};
