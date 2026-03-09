import type { ReactNode } from "react";

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
              <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <p className="flex-1"><InlineMarkdown text={block.value} /></p>
            </div>
          );
        }

        return (
          <p
            key={`${block.type}-${index}`}
            className="text-[15px] leading-8 text-[var(--foreground)]"
          >
            <InlineMarkdown text={block.value} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * Renders inline markdown: **bold**, *italic*, `code`, [timestamp]
 */
function InlineMarkdown({ text }: { text: string }) {
  const parts = parseInlineMarkdown(text);
  return <>{parts}</>;
}

function parseInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Match **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      nodes.push(
        <strong key={key++} className="font-semibold">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      // *italic*
      nodes.push(
        <em key={key++}>
          {match[3]}
        </em>,
      );
    } else if (match[4]) {
      // `code`
      nodes.push(
        <code
          key={key++}
          className="rounded bg-[var(--panel-strong)] px-1.5 py-0.5 font-mono text-[13px]"
        >
          {match[4]}
        </code>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}
