import type { SessionState, TokenUsage } from "@/lib/types";

const CHARS_PER_TOKEN = 4;

export interface SessionTokenTelemetry {
  inputTokens: number;
  outputTokens: number;
  ratio: string;
  hasTelemetry: boolean;
  isEstimated: boolean;
}

function estimateTokenCount(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return Math.max(1, Math.ceil(trimmed.length / CHARS_PER_TOKEN));
}

function estimateFromSessionText(session: SessionState): TokenUsage | null {
  const inputParts = [
    session.name,
    session.input,
    ...session.tasksPending,
  ].filter((part): part is string => !!part && part.trim().length > 0);

  const outputParts = [
    session.output,
    ...session.tasksCompleted,
    ...session.decisions.map((d) => `${d.decision} ${d.reasoning}`.trim()),
    ...session.errorsResolved.map((e) => `${e.error} ${e.fix}`.trim()),
  ].filter((part): part is string => !!part && part.trim().length > 0);

  const inputTokens = estimateTokenCount(inputParts.join("\n"));
  const outputTokens = estimateTokenCount(outputParts.join("\n"));

  if (inputTokens === 0 && outputTokens === 0) return null;
  return {
    inputTokens: Math.max(1, inputTokens),
    outputTokens: Math.max(1, outputTokens),
  };
}

function formatRatio(inputTokens: number, outputTokens: number): string {
  if (inputTokens <= 0) return "—";
  return `${(outputTokens / inputTokens).toFixed(2)}x`;
}

export function resolveSessionTokenTelemetry(
  session: SessionState,
): SessionTokenTelemetry {
  if (session.tokenUsage) {
    const inputTokens = session.tokenUsage.inputTokens ?? 0;
    const outputTokens = session.tokenUsage.outputTokens ?? 0;
    return {
      inputTokens,
      outputTokens,
      ratio: formatRatio(inputTokens, outputTokens),
      hasTelemetry: inputTokens > 0 || outputTokens > 0,
      isEstimated: false,
    };
  }

  const estimated = estimateFromSessionText(session);
  if (!estimated) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      ratio: "—",
      hasTelemetry: false,
      isEstimated: false,
    };
  }

  return {
    inputTokens: estimated.inputTokens,
    outputTokens: estimated.outputTokens,
    ratio: formatRatio(estimated.inputTokens, estimated.outputTokens),
    hasTelemetry: true,
    isEstimated: true,
  };
}
