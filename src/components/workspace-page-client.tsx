"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { saveToHistory } from "@/lib/history";

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

  // Auto-save to history when workspace changes (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!transcript) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToHistory(
        transcript,
        workspace.chatMessages,
        workspace.summaryState,
        workspace.detailState,
      );
    }, 2000);
    return () => clearTimeout(saveTimerRef.current);
  }, [transcript, workspace.chatMessages, workspace.summaryState, workspace.detailState]);

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
          language: transcript.language.label,
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
    setBanner("");
    setIsChatBusy(true);

    // Immediately add user message + empty assistant placeholder for streaming
    setWorkspace((previous) => ({
      ...previous,
      chatMessages: [
        ...previous.chatMessages,
        { role: "user", content: trimmedQuestion },
        { role: "assistant", content: "", sources: [] },
      ],
    }));

    try {
      const response = await fetch("/api/assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: workspace.provider,
          apiKey: currentApiKey,
          model: currentModel,
          instruction: workspace.instruction,
          language: transcript.language.label,
          question: trimmedQuestion,
          messages: workspace.chatMessages,
          transcript: transcript.timestampedTranscript,
          segments: transcript.segments,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as unknown;
        throw new Error(
          getErrorMessage(data, "Failed to answer the question."),
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream.");

      const decoder = new TextDecoder();
      let buffer = "";
      let streamedContent = "";
      let streamedSources: unknown[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const event = JSON.parse(data) as {
              type: string;
              text?: string;
              sources?: unknown[];
              error?: string;
            };

            if (event.type === "sources" && event.sources) {
              streamedSources = event.sources;
            } else if (event.type === "chunk" && event.text) {
              streamedContent += event.text;
              setWorkspace((previous) => {
                const msgs = [...previous.chatMessages];
                const last = msgs[msgs.length - 1];
                if (last?.role === "assistant") {
                  msgs[msgs.length - 1] = {
                    ...last,
                    content: streamedContent,
                    sources: streamedSources as typeof last.sources,
                  };
                }
                return { ...previous, chatMessages: msgs };
              });
            } else if (event.type === "error") {
              throw new Error(event.error || "Stream failed.");
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      // Final update
      setWorkspace((previous) => {
        const msgs = [...previous.chatMessages];
        const last = msgs[msgs.length - 1];
        if (last?.role === "assistant") {
          msgs[msgs.length - 1] = {
            ...last,
            content: streamedContent,
            sources: streamedSources as typeof last.sources,
          };
        }
        return { ...previous, chatMessages: msgs };
      });
    } catch (chatError) {
      // Remove the placeholder messages on error
      setWorkspace((previous) => {
        const msgs = [...previous.chatMessages];
        if (msgs.length >= 2 && msgs[msgs.length - 1]?.role === "assistant") {
          msgs.pop();
          msgs.pop();
        }
        return { ...previous, chatMessages: msgs };
      });
      setQuestion(trimmedQuestion);
      setError(
        chatError instanceof Error
          ? chatError.message
          : "Failed to answer the question.",
      );
    } finally {
      setIsChatBusy(false);
    }
  }

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <WorkspaceNav />
          <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
            <p className="text-sm text-[var(--foreground-muted)]">Loading workspace...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!transcript) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
          <WorkspaceNav />
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-10 text-center">
            <h1 className="text-xl font-semibold">
              No transcript loaded yet.
            </h1>
            <p className="mt-3 text-sm text-[var(--foreground-muted)]">
              Go back, add a YouTube link, and load the transcript first.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-lg bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-[var(--background)] transition hover:opacity-85"
            >
              Back to Load
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--background)] px-5 py-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-3 overflow-hidden">
        <WorkspaceNav>
          <a
            href={transcript.canonicalUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-1.5 text-sm text-[var(--foreground-muted)] transition hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
          >
            YouTube
          </a>
          <NavLink href="/settings">Settings</NavLink>
        </WorkspaceNav>

        {banner || error ? (
          <section
            className={`rounded-xl border px-5 py-4 text-sm ${
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

