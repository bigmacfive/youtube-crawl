"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { VideoHistoryEntry } from "@/lib/history";
import {
  deleteFromHistory,
  readHistory,
} from "@/lib/history";
import {
  buildSelectedVideo,
  createIdleDocumentState,
  writeWorkspaceStorage,
} from "@/lib/workspace";

import { usePersistedWorkspace } from "@/components/use-persisted-workspace";
import { VideoHistoryGrid } from "@/components/video-history-grid";
import { WorkspaceNav } from "@/components/workspace-nav";

export function TranscriptWorkbench() {
  const router = useRouter();
  const { workspace, setWorkspace, isHydrated } = usePersistedWorkspace();
  const [error, setError] = useState("");
  const [history, setHistory] = useState<VideoHistoryEntry[]>(() => readHistory());

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!workspace.url.trim()) {
      setError("Paste a YouTube link first.");
      return;
    }

    // Clear previous transcript so preview page triggers a fresh fetch
    const nextWorkspace = {
      ...workspace,
      transcript: null,
      selectedVideo: null,
      summaryState: createIdleDocumentState(),
      detailState: createIdleDocumentState(),
      chatMessages: [],
    };
    setWorkspace(nextWorkspace);
    writeWorkspaceStorage(nextWorkspace);

    // Navigate immediately — preview page handles loading
    router.push("/preview");
  }

  const handleDeleteHistory = useCallback((videoId: string) => {
    const updated = deleteFromHistory(videoId);
    setHistory(updated);
  }, []);

  const handleLoadHistory = useCallback(
    (entry: VideoHistoryEntry) => {
      const nextWorkspace = {
        ...workspace,
        url: entry.canonicalUrl,
        activeTab: "script" as const,
        transcript: entry.transcript,
        selectedVideo: buildSelectedVideo(entry.transcript),
        summaryState: entry.summaryContent
          ? { status: "loaded" as const, content: entry.summaryContent, error: "" }
          : createIdleDocumentState(),
        detailState: entry.detailContent
          ? { status: "loaded" as const, content: entry.detailContent, error: "" }
          : createIdleDocumentState(),
        chatMessages: entry.chatMessages,
      };
      setWorkspace(nextWorkspace);
      writeWorkspaceStorage(nextWorkspace);
      router.push("/workspace");
    },
    [workspace, setWorkspace, router],
  );

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <WorkspaceNav>
            <NavLink href="/settings">Settings</NavLink>
          </WorkspaceNav>
        </div>
      </main>
    );
  }

  const hasHistory = history.length > 0;

  return (
    <main className="flex h-screen flex-col bg-[var(--background)] px-5 py-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col">
        <WorkspaceNav>
          <NavLink href="/settings">Settings</NavLink>
        </WorkspaceNav>
      </div>

      <div className={`custom-scrollbar mx-auto flex w-full max-w-[1600px] flex-1 flex-col overflow-y-auto ${hasHistory ? "pt-10" : "items-center justify-center pb-20"}`}>
        <div className={`${hasHistory ? "" : "flex flex-col items-center"} w-full`}>
          <h1 className="mb-1 text-lg font-semibold text-[var(--foreground)]">
            youtube-crawl
          </h1>
          <p className="mb-8 text-sm text-[var(--foreground-muted)]">
            Paste a link to get started
          </p>

          <form
            onSubmit={handleSubmit}
            className={`w-full ${hasHistory ? "" : "max-w-lg"}`}
          >
            <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5 transition-colors focus-within:border-[var(--line-strong)]">
              <input
                value={workspace.url}
                onChange={(e) =>
                  setWorkspace((prev) => ({ ...prev, url: e.target.value }))
                }
                placeholder="https://youtube.com/watch?v=..."
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/40"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-[var(--background)] transition hover:opacity-85"
              >
                Load
              </button>
            </div>

            {error && (
              <p className="mt-3 px-1 text-xs text-[var(--danger)]">
                {error}
              </p>
            )}
          </form>

          <VideoHistoryGrid
            entries={history}
            onDelete={handleDeleteHistory}
            onLoad={handleLoadHistory}
          />
        </div>
      </div>
    </main>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm text-[var(--foreground-muted)] transition hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
    >
      {children}
    </Link>
  );
}
