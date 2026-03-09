import type { AssistantMessage } from "@/lib/contracts";

export function ChatMessageList({
  messages,
  isBusy,
  hasTranscript,
}: {
  messages: AssistantMessage[];
  isBusy: boolean;
  hasTranscript?: boolean;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="max-w-xs space-y-3 text-center">
          <p className="text-sm text-[var(--foreground-muted)]">
            {hasTranscript
              ? "Ask anything about the transcript."
              : "Load a transcript to start chatting."}
          </p>
          {hasTranscript && (
            <div className="space-y-1.5 text-left">
              {[
                "Summarize the core argument",
                "What happens after 05:00?",
                "List all claims with evidence",
              ].map((example) => (
                <p
                  key={example}
                  className="rounded-lg bg-[var(--panel)] px-3 py-2 text-xs text-[var(--foreground-muted)]"
                >
                  {example}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar flex-1 space-y-1 overflow-auto px-3 py-3">
      {messages.map((message, index) => (
        <article
          key={`${message.role}-${index}`}
          className={`rounded-xl px-3 py-3 ${
            message.role === "user" ? "bg-[var(--panel)]" : ""
          }`}
        >
          <div className="mb-1 text-[11px] font-medium text-[var(--foreground-muted)]">
            {message.role === "assistant" ? "Assistant" : "You"}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
            {message.content}
          </div>
          {message.sources?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.sources.map((source) => (
                <span
                  key={`${source.label}-${source.start}-${source.end}`}
                  title={source.excerpt}
                  className="rounded-md bg-[var(--panel-soft)] px-2 py-1 font-mono text-[10px] text-[var(--foreground-muted)]"
                >
                  {source.label}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      ))}
      {isBusy && (
        <article className="rounded-xl px-3 py-3">
          <div className="mb-1 text-[11px] font-medium text-[var(--foreground-muted)]">
            Assistant
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--foreground-muted)]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--foreground-muted)] [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--foreground-muted)] [animation-delay:300ms]" />
          </div>
        </article>
      )}
    </div>
  );
}
