"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { TranscriptPayload } from "@/lib/contracts";
import {
  buildSelectedVideo,
  createIdleDocumentState,
  writeWorkspaceStorage,
} from "@/lib/workspace";

import { usePersistedWorkspace } from "@/components/use-persisted-workspace";
import { WorkspaceNav } from "@/components/workspace-nav";

export function TranscriptWorkbench() {
  const router = useRouter();
  const { workspace, setWorkspace, isHydrated } = usePersistedWorkspace();
  const [status, setStatus] = useState("Paste a YouTube link.");
  const [error, setError] = useState("");
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setStatus(
      workspace.transcript
        ? "A transcript is already loaded."
        : "Paste a YouTube link.",
    );
  }, [isHydrated, workspace.transcript]);

  const transcriptReady = Boolean(workspace.transcript);
  const fetchBusy = isFetchingTranscript;

  async function handleTranscriptFetch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!workspace.url.trim()) {
      setError("Paste a YouTube link first.");
      return;
    }

    setIsFetchingTranscript(true);
    setStatus("Loading video and transcript...");

    try {
      const response = await fetch("/api/transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: workspace.url,
          language: workspace.language,
        }),
      });

      const data = (await response.json()) as unknown;
      const payload = data as TranscriptPayload;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to load the transcript."),
        );
      }

      const nextWorkspace = {
        ...workspace,
        activeTab: "script" as const,
        transcript: payload,
        selectedVideo: buildSelectedVideo(payload),
        summaryState: createIdleDocumentState(),
        detailState: createIdleDocumentState(),
        chatMessages: [],
      };

      setWorkspace(nextWorkspace);
      writeWorkspaceStorage(nextWorkspace);

      setStatus("Video loaded. Opening preview...");
      router.push("/preview");
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load the transcript.",
      );
      setStatus("Transcript request failed.");
    } finally {
      setIsFetchingTranscript(false);
    }
  }

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-[var(--foreground)] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <WorkspaceNav>
            <Link
              href="/settings"
              className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
            >
              Settings
            </Link>
          </WorkspaceNav>
          <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_20px_50px_rgba(40,52,78,0.06)]">
            <p className="text-sm text-[var(--muted)]">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5">
        <WorkspaceNav>
          <Link
            href="/settings"
            className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
          >
            Settings
          </Link>
        </WorkspaceNav>

        <section className="flex flex-1 items-center justify-center py-6">
          <form
            onSubmit={handleTranscriptFetch}
            className="w-full max-w-3xl rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_24px_60px_rgba(40,52,78,0.08)] sm:p-6"
          >
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-soft)] p-4 sm:p-5">
              <input
                value={workspace.url}
                onChange={(event) =>
                  setWorkspace((previous) => ({
                    ...previous,
                    url: event.target.value,
                  }))
                }
                placeholder="https://www.youtube.com/watch?v=..."
                className="min-h-[72px] w-full rounded-[20px] border border-[var(--line)] bg-white px-5 text-base outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] sm:text-lg"
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={fetchBusy}
                  className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {fetchBusy ? "Loading..." : "Load"}
                </button>
                {transcriptReady ? (
                  <Link
                    href="/preview"
                    className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-center text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--line-strong)]"
                  >
                    Continue
                  </Link>
                ) : null}
              </div>

              <p
                className={`mt-4 text-sm leading-7 ${
                  error ? "text-[var(--danger)]" : "text-[var(--muted)]"
                }`}
              >
                {error || status}
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function getErrorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const record = value as { error?: unknown };
  return typeof record.error === "string" ? record.error : fallback;
}
