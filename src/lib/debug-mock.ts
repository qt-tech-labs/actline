/**
 * The mocked plan the debug drawer hands to the studio: when it is on, a
 * generation returns this plan instead of asking a model.
 * Module state, read at the moment the user presses Generate.
 */
type MockState = { enabled: boolean; text: string };

const state: MockState = { enabled: false, text: "" };

export function setDebugMock(next: MockState) {
  state.enabled = next.enabled;
  state.text = next.text;
}

export type DebugMockRead = { plan: Record<string, unknown> } | { error: string } | null;

/** `null` when mocking is off; otherwise the parsed plan, or why it can't be used. */
export function readDebugMock(): DebugMockRead {
  if (!state.enabled) return null;
  try {
    const value: unknown = JSON.parse(state.text);
    if (value && typeof value === "object" && !Array.isArray(value)) return { plan: value as Record<string, unknown> };
    return { error: "The mocked plan must be a JSON object" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The mocked plan is not valid JSON" };
  }
}
