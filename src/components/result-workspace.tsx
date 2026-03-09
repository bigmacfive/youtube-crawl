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
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_392px]">
      <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <ContentTabs
          activeTab={activeTab}
          summaryState={summaryState}
          detailState={detailState}
          onSelect={onTabChange}
        />

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

      <div className="xl:sticky xl:top-5 xl:h-[calc(100vh-40px)]">
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
