import type { TranscriptPayload } from "@/lib/contracts";
import { buildScriptSections } from "@/lib/workspace";

export function ScriptView({
  transcript,
}: {
  transcript: TranscriptPayload | null;
}) {
  if (!transcript) {
    return (
      <div className="flex min-h-[420px] items-center justify-center px-6 py-10">
        <div className="max-w-xl space-y-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[var(--muted)]">
            Script
          </p>
          <h3 className="text-xl font-semibold text-[var(--foreground)]">
            Load a YouTube link to open the reading workspace.
          </h3>
          <p className="text-sm leading-7 text-[var(--muted)]">
            The raw transcript is the default view. Summary and Detail stay on
            standby until you ask for them.
          </p>
        </div>
      </div>
    );
  }

  const sections = buildScriptSections(transcript.segments);

  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-soft)] px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Raw Transcript
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                {transcript.title ?? transcript.videoId}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                Read the original transcript first. Each block keeps the source
                timestamps visible so chat, Summary, and Detail can stay grounded.
              </p>
            </div>
            <div className="grid min-w-[220px] gap-2 sm:grid-cols-2">
              <StatPill
                label="Segments"
                value={transcript.stats.segmentCount.toLocaleString("en-US")}
              />
              <StatPill label="Language" value={transcript.language.label} />
              <StatPill
                label="Words"
                value={transcript.stats.wordCount.toLocaleString("en-US")}
              />
              <StatPill
                label="Sections"
                value={sections.length.toLocaleString("en-US")}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <section
              key={section.id}
              className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--panel)] shadow-[0_8px_24px_rgba(40,52,78,0.04)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Section
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                    {section.label}
                  </p>
                </div>
                <span className="rounded-full border border-[var(--line)] bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  {section.segments.length} entries
                </span>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {section.segments.map((segment, index) => (
                  <div
                    key={`${section.id}-${segment.start}-${index}`}
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[84px_minmax(0,1fr)] sm:gap-5"
                  >
                    <div className="font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                      {segment.timestamp}
                    </div>
                    <p className="text-[15px] leading-8 text-[var(--foreground)]">
                      {segment.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-white px-3 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
