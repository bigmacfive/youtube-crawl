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
    <form onSubmit={onSubmit} className="border-t border-[var(--line)] p-3">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] transition-colors focus-within:border-[var(--line-strong)]">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          placeholder="Ask about the transcript..."
          className="w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/40"
        />
        <div className="flex items-center justify-between px-3 pb-2.5">
          <span className="text-[11px] text-[var(--foreground-muted)]/50">
            Enter to send
          </span>
          <button
            type="submit"
            disabled={disabled}
            className="rounded-md bg-[var(--foreground)] px-3 py-1 text-xs font-medium text-[var(--background)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
