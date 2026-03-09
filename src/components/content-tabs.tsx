import type { GeneratedDocumentState, ContentTab } from "@/lib/workspace";

interface ContentTabsProps {
  activeTab: ContentTab;
  summaryState: GeneratedDocumentState;
  detailState: GeneratedDocumentState;
  onSelect: (tab: ContentTab) => void;
}

export function ContentTabs({
  activeTab,
  summaryState,
  detailState,
  onSelect,
}: ContentTabsProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-[var(--panel-soft)]/85 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <TabButton
          label="Script"
          hint="Live"
          active={activeTab === "script"}
          onClick={() => onSelect("script")}
        />
        <TabButton
          label="Summary"
          hint={describeState(summaryState)}
          active={activeTab === "summary"}
          onClick={() => onSelect("summary")}
        />
        <TabButton
          label="Detail"
          hint={describeState(detailState)}
          active={activeTab === "detail"}
          onClick={() => onSelect("detail")}
        />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Script opens instantly. Summary and Detail generate only when their tab
        is opened for the first time.
      </p>
    </div>
  );
}

function TabButton({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-3 rounded-[12px] border px-4 py-2.5 text-sm transition ${
        active
          ? "border-[var(--line-strong)] bg-[var(--panel)] text-[var(--foreground)] shadow-[0_1px_0_rgba(0,0,0,0.04)]"
          : "border-transparent bg-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span
        className={`rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
          active
            ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
            : "bg-[var(--panel-soft)] text-[var(--muted)]"
        }`}
      >
        {hint}
      </span>
    </button>
  );
}

function describeState(state: GeneratedDocumentState) {
  switch (state.status) {
    case "loading":
      return "Loading";
    case "loaded":
      return "Ready";
    case "error":
      return "Retry";
    default:
      return "On demand";
  }
}
