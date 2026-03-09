import type { TranscriptPayload } from "@/lib/contracts";

const PARAGRAPH_INTERVAL = 60; // new paragraph every ~1 minute

export function ScriptView({
  transcript,
}: {
  transcript: TranscriptPayload | null;
}) {
  if (!transcript) {
    return (
      <div className="flex min-h-[420px] items-center justify-center px-6 py-10">
        <div className="max-w-xl space-y-3 text-center">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Load a YouTube link to open the reading workspace.
          </h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            The raw transcript is the default view.
          </p>
        </div>
      </div>
    );
  }

  // Group segments into paragraphs by time interval
  const paragraphs: { timestamp: string; texts: string[] }[] = [];
  let currentParagraph: { timestamp: string; texts: string[] } | null = null;
  let lastBreak = -PARAGRAPH_INTERVAL;

  for (const segment of transcript.segments) {
    if (!currentParagraph || segment.start - lastBreak >= PARAGRAPH_INTERVAL) {
      currentParagraph = { timestamp: segment.timestamp, texts: [] };
      paragraphs.push(currentParagraph);
      lastBreak = segment.start;
    }
    currentParagraph.texts.push(segment.text);
  }

  return (
    <div className="px-5 py-5 sm:px-6">
      <div className="space-y-5">
        {paragraphs.map((para, index) => (
          <div key={index}>
            <span className="mb-1.5 inline-block rounded bg-[var(--panel-soft)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground-muted)]/50">
              {para.timestamp}
            </span>
            <p className="text-[15px] leading-[2] text-[var(--foreground)]">
              {para.texts.join(" ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
