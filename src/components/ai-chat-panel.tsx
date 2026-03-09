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
    <aside className="flex min-h-[720px] flex-col overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="border-b border-[var(--line)] bg-[var(--panel-soft)] px-5 py-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
          AI Chat
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
          Transcript assistant
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          {transcript
            ? "The assistant stays alongside the document and answers from the current video."
            : "Load a transcript first. The chat panel stays ready, but it needs a video to ground answers."}
        </p>
        {disabled ? (
          <div className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Add a provider key in{" "}
            <Link
              href="/settings"
              className="font-medium text-[var(--accent-strong)]"
            >
              Settings
            </Link>
            .
          </div>
        ) : null}
      </div>

      <ChatMessageList messages={messages} isBusy={isBusy} />
      <ChatInputBox
        value={question}
        onChange={onQuestionChange}
        onSubmit={onSubmit}
        disabled={disabled}
      />
    </aside>
  );
}
