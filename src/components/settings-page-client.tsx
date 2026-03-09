"use client";

import Link from "next/link";

import type { AssistantProvider } from "@/lib/contracts";
import { PROVIDERS } from "@/lib/providers";
import { createEmptyProviderMap } from "@/lib/workspace";

import { usePersistedWorkspace } from "@/components/use-persisted-workspace";
import { WorkspaceNav } from "@/components/workspace-nav";

export function SettingsPageClient() {
  const { workspace, setWorkspace, isHydrated } = usePersistedWorkspace();
  const currentProvider = PROVIDERS[workspace.provider];
  const currentApiKey = workspace.apiKeys[workspace.provider];
  const currentModel = workspace.providerModels[workspace.provider];
  const transcriptReady = Boolean(workspace.transcript);

  function updateWorkspace<
    K extends keyof typeof workspace,
  >(key: K, value: (typeof workspace)[K]) {
    setWorkspace((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function updateCurrentApiKey(value: string) {
    setWorkspace((previous) => ({
      ...previous,
      apiKeys: {
        ...previous.apiKeys,
        [previous.provider]: value,
      },
    }));
  }

  function updateCurrentModel(value: string) {
    setWorkspace((previous) => ({
      ...previous,
      providerModels: {
        ...previous.providerModels,
        [previous.provider]: value,
      },
    }));
  }

  function clearStoredKeys() {
    setWorkspace((previous) => ({
      ...previous,
      apiKeys: createEmptyProviderMap(),
    }));
  }

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-[var(--foreground)] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <WorkspaceNav backHref="/" backLabel="Back" />
          <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_20px_50px_rgba(40,52,78,0.06)]">
            <p className="text-sm text-[var(--muted)]">Loading settings...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-5 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <WorkspaceNav
          backHref={transcriptReady ? "/preview" : "/"}
          backLabel={transcriptReady ? "Back to Video" : "Back"}
        >
          {transcriptReady ? (
            <Link
              href="/workspace"
              className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-medium text-[var(--accent-strong)] transition hover:bg-white"
            >
              Workspace
            </Link>
          ) : null}
        </WorkspaceNav>

        <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_20px_50px_rgba(40,52,78,0.06)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                Local Storage
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                AI settings live only on this device.
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                Keys stay in local browser storage. They are only sent when you
                explicitly generate Summary, Detail, or ask something in chat.
              </p>
              <button
                type="button"
                onClick={clearStoredKeys}
                className="mt-5 rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
              >
                Clear Saved Keys
              </button>
            </div>

            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_20px_50px_rgba(40,52,78,0.06)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                Transcript Defaults
              </p>
              <label className="mt-4 grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                  Caption Language
                </span>
                <input
                  value={workspace.language}
                  onChange={(event) =>
                    updateWorkspace("language", event.target.value)
                  }
                  placeholder="Optional. Example: en, ko, ja"
                  className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                />
              </label>
            </div>
          </aside>

          <div className="space-y-5">
            <section className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_20px_50px_rgba(40,52,78,0.06)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                Provider
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(
                  Object.entries(PROVIDERS) as Array<
                    [AssistantProvider, (typeof PROVIDERS)[AssistantProvider]]
                  >
                ).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateWorkspace("provider", key)}
                    className={`rounded-[20px] border px-4 py-4 text-left transition ${
                      workspace.provider === key
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                        : "border-[var(--line)] bg-[var(--panel-soft)] text-[var(--foreground)] hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                      {item.detail}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_20px_50px_rgba(40,52,78,0.06)]">
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                    API Key
                  </span>
                  <input
                    type="password"
                    value={currentApiKey}
                    onChange={(event) => updateCurrentApiKey(event.target.value)}
                    placeholder={currentProvider.keyPlaceholder}
                    className="min-h-14 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                    Model
                  </span>
                  <input
                    value={currentModel}
                    onChange={(event) => updateCurrentModel(event.target.value)}
                    placeholder={currentProvider.model}
                    className="min-h-14 rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                    Optional Instruction
                  </span>
                  <textarea
                    value={workspace.instruction}
                    onChange={(event) =>
                      updateWorkspace("instruction", event.target.value)
                    }
                    rows={5}
                    placeholder="Example: answer in Korean, focus on business takeaways, keep responses concise."
                    className="rounded-2xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-4 text-sm leading-7 outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                  />
                </label>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
