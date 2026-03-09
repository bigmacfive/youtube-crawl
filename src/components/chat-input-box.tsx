export function ChatInputBox({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-0 border-t border-[var(--line)] bg-[var(--panel)] p-4"
    >
      <div className="space-y-3 rounded-[20px] border border-[var(--line)] bg-white p-3">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          placeholder="Ask about the current transcript. Example: Split the speaker's claims and evidence after 05:00."
          className="min-h-28 w-full resize-none bg-transparent px-1 py-1 text-sm leading-7 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Transcript-grounded answers with timestamps when available
          </p>
          <button
            type="submit"
            disabled={disabled}
            className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
