import type { AssistantMessage, TranscriptPayload } from "@/lib/contracts";
import type {
  ContentTab,
  GeneratedDocumentState,
} from "@/lib/workspace";

import { AiChatPanel } from "@/components/ai-chat-panel";
import { ContentTabs } from "@/components/content-tabs";
import { DetailView } from "@/components/detail-view";
import { ScriptView } from "@/components/script-view";
import { SummaryView } from "@/components/summary-view";

export function ResultWorkspace({
  transcript,
  activeTab,
  summaryState,
  detailState,
  onTabChange,
  onRequestSummary,
  onRequestDetail,
  chatMessages,
  chatQuestion,
  onChatQuestionChange,
  onChatSubmit,
  isChatBusy,
  aiDisabled,
}: {
  transcript: TranscriptPayload | null;
  activeTab: ContentTab;
  summaryState: GeneratedDocumentState;
  detailState: GeneratedDocumentState;
  onTabChange: (tab: ContentTab) => void;
  onRequestSummary: () => void;
  onRequestDetail: () => void;
  chatMessages: AssistantMessage[];
  chatQuestion: string;
  onChatQuestionChange: (value: string) => void;
  onChatSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isChatBusy: boolean;
  aiDisabled: boolean;
}) {
  return (
    <section className="min-h-0 flex-1 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_392px]">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        <ContentTabs
          activeTab={activeTab}
          summaryState={summaryState}
          detailState={detailState}
          onSelect={onTabChange}
        />

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
          {activeTab === "script" ? <ScriptView transcript={transcript} /> : null}
          {activeTab === "summary" ? (
            <SummaryView
              state={summaryState}
              onGenerate={onRequestSummary}
              disabled={aiDisabled}
            />
          ) : null}
          {activeTab === "detail" ? (
            <DetailView
              state={detailState}
              onGenerate={onRequestDetail}
              disabled={aiDisabled}
            />
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-col">
        <AiChatPanel
          transcript={transcript}
          messages={chatMessages}
          question={chatQuestion}
          onQuestionChange={onChatQuestionChange}
          onSubmit={onChatSubmit}
          isBusy={isChatBusy}
          disabled={aiDisabled}
        />
      </div>
    </section>
  );
}
