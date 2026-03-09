import type { AssistantMessage } from "@/lib/contracts";

export function ChatMessageList({
  messages,
  isBusy,
}: {
  messages: AssistantMessage[];
  isBusy: boolean;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="max-w-sm space-y-4 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            AI Panel
          </p>
          <p className="text-sm leading-7 text-[var(--muted)]">
            Ask about claims, timestamps, action items, or only a portion of the
            video. The transcript remains the source of truth.
          </p>
          <div className="space-y-2 rounded-[18px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 text-left text-sm leading-7 text-[var(--foreground)]">
            <p>Summarize the core argument in 3 lines.</p>
            <p>Explain only the part after 05:00.</p>
            <p>Separate claims from evidence.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
      {messages.map((message, index) => (
        <article
          key={`${message.role}-${index}`}
          className={`rounded-[20px] border px-4 py-4 ${
            message.role === "assistant"
              ? "border-[var(--line)] bg-white"
              : "border-[var(--accent)]/20 bg-[var(--accent-soft)]"
          }`}
        >
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {message.role === "assistant" ? "Assistant" : "You"}
          </div>
          <div className="mt-3 whitespace-pre-wrap text-[15px] leading-8 text-[var(--foreground)]">
            {message.content}
          </div>
          {message.sources?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.sources.map((source) => (
                <span
                  key={`${source.label}-${source.start}-${source.end}`}
                  title={source.excerpt}
                  className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]"
                >
                  {source.label}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      ))}
      {isBusy ? (
        <div className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Assistant
          </div>
          <div className="mt-3 space-y-3">
            <div className="h-3 w-full rounded-full bg-[var(--line)]/55" />
            <div className="h-3 w-[82%] rounded-full bg-[var(--line)]/55" />
            <div className="h-3 w-[65%] rounded-full bg-[var(--line)]/55" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
