import { parseStructuredText } from "@/lib/workspace";

export function FormattedTextBlocks({
  content,
  compact = false,
}: {
  content: string;
  compact?: boolean;
}) {
  const blocks = parseStructuredText(content);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3
              key={`${block.type}-${index}`}
              className="pt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]"
            >
              {block.value}
            </h3>
          );
        }

        if (block.type === "bullet") {
          return (
            <div
              key={`${block.type}-${index}`}
              className="flex items-start gap-3 text-[15px] leading-8 text-[var(--foreground)]"
            >
              <span className="mt-[11px] h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <p className="flex-1">{block.value}</p>
            </div>
          );
        }

        return (
          <p
            key={`${block.type}-${index}`}
            className="text-[15px] leading-8 text-[var(--foreground)]"
          >
            {block.value}
          </p>
        );
      })}
    </div>
  );
}
