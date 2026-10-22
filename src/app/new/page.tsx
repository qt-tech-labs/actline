import { ActionBar } from "@/components/new/ActionBar";
import { BlueprintPreview } from "@/components/new/BlueprintPreview";
import { BlueprintSection } from "@/components/new/BlueprintSection";
import { IdeaGenerator } from "@/components/new/IdeaGenerator";
import { NewProjectProvider } from "@/components/new/NewProjectProvider";
import { PlanErrorNotice } from "@/components/new/PlanErrorNotice";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { AppHeader } from "@/components/layout/AppHeader";
import { getCurrentUser } from "@/server/auth";
import { defaultBlueprintInput } from "@/server/blueprint-cookie";
import { defaultPlanProvider } from "@/server/ai/architects";
import { debugEnabled } from "@/server/debug";
import { readCurrentDraft, resolveIotEnabled } from "@/server/services/blueprint";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const user = await getCurrentUser();
  const draft = await readCurrentDraft(user.id);
  const input = draft?.input ?? defaultBlueprintInput();
  // No draft yet: the studio shows the empty state and nothing is planned
  // until the user asks the model for a plan.
  const blueprint = draft?.blueprint ?? null;
  const iotEnabled = blueprint ? resolveIotEnabled(input, blueprint) : false;

  return (
    <>
      <AppHeader projectId={null} mode="create" />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-space-2xl px-4 py-8 md:px-8">
        <NewProjectProvider
          initial={input}
          initialProvider={defaultPlanProvider()}
          blueprintId={draft?.id ?? null}
          suggestion={draft?.constraints ?? null}
        >
          {mode === "dashboard" && debugEnabled() ? <DebugPanel /> : null}
          <PlanErrorNotice />
          <IdeaGenerator />
          <BlueprintSection>
            <BlueprintPreview blueprint={blueprint} iotEnabled={iotEnabled} />
          </BlueprintSection>
          <ActionBar blueprint={blueprint} />
        </NewProjectProvider>
      </main>
    </>
  );
}
