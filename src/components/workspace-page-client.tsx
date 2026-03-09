"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { ResultWorkspace } from "@/components/result-workspace";
import { usePersistedWorkspace } from "@/components/use-persisted-workspace";
import { WorkspaceNav } from "@/components/workspace-nav";

export function WorkspacePageClient() {
  const { workspace, setWorkspace, isHydrated } = usePersistedWorkspace();
  const [question, setQuestion] = useState("");
  const [banner, setBanner] = useState("");
  const [error, setError] = useState("");
  const [isChatBusy, setIsChatBusy] = useState(false);
  const [isTabPending, startTabTransition] = useTransition();

  const transcript = workspace.transcript;
  const currentApiKey = workspace.apiKeys[workspace.provider];
  const currentModel = workspace.providerModels[workspace.provider];
  const canUseAI = Boolean(
    transcript && currentApiKey.trim() && currentModel.trim(),
  );

  const topMeta = useMemo(
    () => [
      {
        label: "Source",
        value: workspace.selectedVideo?.title ?? "No transcript loaded",
      },
      {
        label: "Tab",
        value:
          workspace.activeTab.charAt(0).toUpperCase() +
          workspace.activeTab.slice(1),
      },
      {
        label: "AI",
        value: currentModel || "Configure in Settings",
      },
    ],
    [currentModel, workspace.activeTab, workspace.selectedVideo?.title],
  );

  async function requestDocument(mode: "summary" | "detail") {
    if (!transcript) {
      setError("Load a transcript before requesting AI output.");
      return;
    }

    if (!canUseAI) {
      setError("Add an API key and model in Settings first.");
      return;
    }

    setError("");
    setBanner(
      mode === "summary"
        ? "Generating the summary view..."
        : "Generating the detailed reading view...",
    );

    setWorkspace((previous) => ({
      ...previous,
      [mode === "summary" ? "summaryState" : "detailState"]: {
        status: "loading",
        content: "",
        error: "",
      },
    }));

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: workspace.provider,
          apiKey: currentApiKey,
          model: currentModel,
          mode,
          instruction: workspace.instruction,
          transcript: transcript.timestampedTranscript,
          segments: transcript.segments,
        }),
      });

      const data = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to generate AI output."),
        );
      }

      setWorkspace((previous) => ({
        ...previous,
        [mode === "summary" ? "summaryState" : "detailState"]: {
          status: "loaded",
          content: getContent(data),
          error: "",
        },
      }));

      setBanner(
        mode === "summary"
          ? "Summary generated and cached for this video."
          : "Detailed notes generated and cached for this video.",
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Failed to generate AI output.";

      setWorkspace((previous) => ({
        ...previous,
        [mode === "summary" ? "summaryState" : "detailState"]: {
          status: "error",
          content: "",
          error: message,
        },
      }));
      setError(message);
      setBanner("");
    }
  }

  async function handleTabChange(tab: "script" | "summary" | "detail") {
    startTabTransition(() => {
      setWorkspace((previous) => ({
        ...previous,
        activeTab: tab,
      }));
    });

    if (tab === "summary" && workspace.summaryState.status === "idle" && canUseAI) {
      await requestDocument("summary");
    }

    if (tab === "detail" && workspace.detailState.status === "idle" && canUseAI) {
      await requestDocument("detail");
    }
  }

  async function handleChatSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!transcript) {
      setError("Load a transcript before using the AI chat panel.");
      return;
    }

    if (!canUseAI) {
      setError("Add an API key and model in Settings first.");
      return;
    }

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError("Write a question first.");
      return;
    }

    setQuestion("");
    setError("");
    setBanner("Searching the transcript and drafting an answer...");
    setIsChatBusy(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: workspace.provider,
          apiKey: currentApiKey,
          model: currentModel,
          mode: "chat",
          instruction: workspace.instruction,
          question: trimmedQuestion,
          messages: workspace.chatMessages,
          transcript: transcript.timestampedTranscript,
          segments: transcript.segments,
        }),
      });

      const data = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Failed to answer the question."),
        );
      }

      setWorkspace((previous) => ({
        ...previous,
        chatMessages: [
          ...previous.chatMessages,
          { role: "user", content: trimmedQuestion },
          {
            role: "assistant",
            content: getContent(data),
            sources: getSources(data),
          },
        ],
      }));
      setBanner("Answer ready.");
    } catch (chatError) {
      setQuestion(trimmedQuestion);
      setError(
        chatError instanceof Error
          ? chatError.message
          : "Failed to answer the question.",
      );
      setBanner("");
    } finally {
      setIsChatBusy(false);
    }
  }

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-[var(--foreground)] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <WorkspaceNav backHref="/preview" backLabel="Video" />
          <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <p className="text-sm text-[var(--muted)]">Loading workspace...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!transcript) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-[var(--foreground)] sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <WorkspaceNav backHref="/" backLabel="Back" />
          <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-10 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">
              No transcript is loaded yet.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Go back, add a YouTube link, and load the
              transcript first.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-full border border-[var(--accent)] bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Back to Load
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <WorkspaceNav backHref="/preview" backLabel="Video">
          <Link
            href="/settings"
            className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
          >
            Settings
          </Link>
          <a
            href={transcript.canonicalUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
          >
            YouTube
          </a>
        </WorkspaceNav>

        <section className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                <span>{transcript.language.label}</span>
                <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
                <span>
                  {transcript.stats.segmentCount.toLocaleString("en-US")} segments
                </span>
                {transcript.authorName ? (
                  <>
                    <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
                    <span>{transcript.authorName}</span>
                  </>
                ) : null}
              </div>
              <h1 className="mt-3 max-w-5xl text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                {transcript.title ?? transcript.videoId}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Script is live. Summary and Detail stay dormant until you open
                their tabs.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {topMeta.map((item) => (
                <div
                  key={item.label}
                  className="min-w-[128px] rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {banner || error ? (
          <section
            className={`rounded-2xl border px-5 py-4 text-sm leading-7 shadow-[0_18px_40px_rgba(15,23,42,0.06)] ${
              error
                ? "border-[var(--danger)]/35 bg-[var(--danger-soft)]"
                : "border-[var(--line)] bg-[var(--panel)]"
            }`}
          >
            {error || banner}
          </section>
        ) : null}

        <ResultWorkspace
          transcript={transcript}
          activeTab={workspace.activeTab}
          summaryState={workspace.summaryState}
          detailState={workspace.detailState}
          onTabChange={handleTabChange}
          onRequestSummary={() => void requestDocument("summary")}
          onRequestDetail={() => void requestDocument("detail")}
          chatMessages={workspace.chatMessages}
          chatQuestion={question}
          onChatQuestionChange={setQuestion}
          onChatSubmit={handleChatSubmit}
          isChatBusy={isChatBusy || isTabPending}
          aiDisabled={!canUseAI}
        />
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

function getContent(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as { content?: unknown };
  return typeof record.content === "string" ? record.content : "";
}

function getSources(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as { sources?: unknown };
  return Array.isArray(record.sources) ? record.sources : [];
}
