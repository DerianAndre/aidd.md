import {
  Clock,
  GitBranch,
  CheckCircle2,
  Trash2,
  MoreVertical,
  Cpu,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComplianceRing } from "./compliance-ring";
import { PhaseStepper } from "./phase-stepper";
import { formatDate, formatRelativeTime, truncate } from "../../../lib/utils";
import type { SessionState, ArtifactEntry } from "../../../lib/types";
import type { WorkflowCompliance } from "../lib/workflow-compliance";
import { resolveSessionTokenTelemetry } from "../lib/token-telemetry";
import {
  getDateInput,
  getSessionEndedMs,
  getSessionStartedMs,
} from "../lib/session-time";

interface SessionCardProps {
  session: SessionState;
  artifacts: ArtifactEntry[];
  pendingDrafts?: number;
  compliance?: WorkflowCompliance;
  onPress?: () => void;
  onEdit?: () => void;
  onComplete?: (id: string) => void;
  onFixCompliance?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function SessionCard({
  session,
  artifacts,
  pendingDrafts = 0,
  compliance,
  onPress,
  onEdit,
  onComplete,
  onFixCompliance,
  onDelete,
}: SessionCardProps) {
  const isActive = !session.endedAt;
  const modelLabel = session.aiProvider.model
    .replace("claude-", "")
    .replace(/-\d{8}$/, "");
  const complianceScore = session.outcome?.complianceScore ?? 0;
  const fastTrack = session.taskClassification?.fastTrack ?? false;
  const startedMs = getSessionStartedMs(session);
  const endedMs = session.endedAt ? getSessionEndedMs(session) : Date.now();
  const durationMs =
    Number.isFinite(startedMs) &&
    Number.isFinite(endedMs) &&
    endedMs >= startedMs
      ? endedMs - startedMs
      : 0;
  const durationLabel =
    durationMs < 60_000
      ? `${Math.round(durationMs / 1000)}s`
      : `${Math.round(durationMs / 60_000)}m`;
  const tokenTelemetry = resolveSessionTokenTelemetry(session);
  const inputTokens = tokenTelemetry.inputTokens;
  const outputTokens = tokenTelemetry.outputTokens;
  const qualityState = isActive
    ? "In Flight"
    : compliance?.status === "non-compliant"
      ? "Non-Compliant"
      : "Compliant";
  const qualityColor = isActive
    ? "accent"
    : compliance?.status === "non-compliant"
      ? "danger"
      : "success";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onPress && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onPress();
    }
  };

  return (
    <Card
      onClick={onPress}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="cursor-pointer border-border transition-colors hover:bg-accent/20"
      data-session-id={session.id}
    >
      <CardHeader>
        <CardTitle>
          {session.name || truncate(session.input || session.id, 60)}
        </CardTitle>
        <CardDescription className="flex items-baseline gap-3 text-xs">
          <GitBranch size={9} />
          <span className="truncate -ml-1.5">
            {truncate(session.branch, 20)}
          </span>
          <Cpu size={9} />
          <span className="-ml-1.5">{modelLabel}</span>
          <Clock size={10} />
          <span className="-ml-1.5">
            {formatRelativeTime(
              getDateInput(session.startedAtTs ?? session.startedAt),
            )}
          </span>

          <Calendar size={10} />
          <span className="-ml-1.5">
            {formatDate(getDateInput(session.startedAtTs ?? session.startedAt))}
          </span>
        </CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e) => e.stopPropagation()}
                aria-label="Session actions"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit()}>
                  Edit
                </DropdownMenuItem>
              )}
              {isActive && onComplete && (
                <DropdownMenuItem onClick={() => onComplete(session.id)}>
                  <CheckCircle2 size={14} />
                  Complete
                </DropdownMenuItem>
              )}
              {onFixCompliance && (
                <DropdownMenuItem onClick={() => onFixCompliance(session.id)}>
                  Fix Compliance
                </DropdownMenuItem>
              )}
              {(onEdit || (isActive && onComplete)) && onDelete && (
                <DropdownMenuSeparator />
              )}
              {onDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(session.id)}
                >
                  <Trash2 size={14} />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription>
          {truncate(
            session.input ??
              "No descrption available, review the session for more information.",
            225,
          )}
        </CardDescription>
        <div className="flex width-full items-center gap-2">
          <Chip size="sm" color={isActive ? "accent" : "default"}>
            {isActive ? "Active" : "Completed"}
          </Chip>
          <Chip size="sm" color={qualityColor}>
            {qualityState}
          </Chip>
          {!isActive && compliance?.status === "non-compliant" && (
            <Chip
              size="sm"
              color="danger"
              title={compliance.missing.join(", ")}
            >
              Missing {compliance.missing.length}
            </Chip>
          )}
          {pendingDrafts > 0 && (
            <Chip size="sm" color="warning">
              Pending Approval {pendingDrafts}
            </Chip>
          )}
          {session.taskClassification?.domain && (
            <Chip size="sm" color="default">
              {session.taskClassification.domain}
            </Chip>
          )}
          {session.taskClassification?.nature && (
            <Chip size="sm" color="info">
              {session.taskClassification.nature}
            </Chip>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>Id: {truncate(session.id, 14)}</div>
          <div>
            Tokens:{" "}
            <span className="font-mono text-foreground">
              {tokenTelemetry.hasTelemetry
                ? `${inputTokens}/${outputTokens}`
                : "not recorded"}
            </span>
          </div>
          <div>
            Output/Input ratio:{" "}
            <span className="font-mono text-foreground">
              {tokenTelemetry.ratio}
            </span>
          </div>
          <div>
            Duration:{" "}
            <span className="font-mono text-foreground">{durationLabel}</span>
          </div>
          <div>
            Artifacts:{" "}
            <span className="font-mono text-foreground">
              {artifacts.length}
            </span>
          </div>
          <div>Complexity: {session.taskClassification.complexity}</div>
          {tokenTelemetry.isEstimated && (
            <div className="col-span-2 text-[10px] text-amber-600">
              Token telemetry estimated from session text.
            </div>
          )}
        </div>

        <div className="rounded-md border border-border mt-auto p-2">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Lifecycle</span>
            <span className="font-medium">{complianceScore}%</span>
          </div>
          <div className="flex items-center gap-2">
            <ComplianceRing score={complianceScore} size="sm" />
            <PhaseStepper
              artifacts={artifacts}
              fastTrack={fastTrack}
              session={session}
              orientation="horizontal"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
