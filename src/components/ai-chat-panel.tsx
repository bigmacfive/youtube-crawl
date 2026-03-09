import Link from "next/link";

import type { AssistantMessage, TranscriptPayload } from "@/lib/contracts";

import { ChatInputBox } from "@/components/chat-input-box";
import { ChatMessageList } from "@/components/chat-message-list";

export function AiChatPanel({
  transcript,
  messages,
  question,
  onQuestionChange,
  onSubmit,
  isBusy,
  disabled,
}: {
  transcript: TranscriptPayload | null;
  messages: AssistantMessage[];
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isBusy: boolean;
  disabled: boolean;
}) {
  return (
    <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Chat
        </span>
        {disabled && (
          <Link
            href="/settings"
            className="text-xs text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
          >
            Add API key
          </Link>
        )}
      </div>

      {/* Messages */}
      <ChatMessageList
        messages={messages}
        isBusy={isBusy}
        hasTranscript={Boolean(transcript)}
      />

      {/* Input */}
      <ChatInputBox
        value={question}
        onChange={onQuestionChange}
        onSubmit={onSubmit}
        disabled={disabled}
      />
    </aside>
  );
}
