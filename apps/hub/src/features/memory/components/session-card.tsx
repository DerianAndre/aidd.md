import {
  Clock,
  GitBranch,
  CheckCircle2,
  Trash2,
  MoreVertical,
  Cpu,
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
import { formatRelativeTime, truncate } from "../../../lib/utils";
import type { SessionState, ArtifactEntry } from "../../../lib/types";

interface SessionCardProps {
  session: SessionState;
  artifacts: ArtifactEntry[];
  onPress?: () => void;
  onEdit?: () => void;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function SessionCard({
  session,
  artifacts,
  onPress,
  onEdit,
  onComplete,
  onDelete,
}: SessionCardProps) {
  const isActive = !session.endedAt;
  const modelLabel = session.aiProvider.model
    .replace("claude-", "")
    .replace(/-\d{8}$/, "");
  const complianceScore = session.outcome?.complianceScore ?? 0;
  const fastTrack = session.taskClassification?.fastTrack ?? false;

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
      className="group/card-session transition-all hover:scale-[1.01] hover:shadow-lg cursor-pointer"
      data-session-id={session.id}
    >
      <CardHeader>
        <CardTitle>
          {session.name || truncate(session.input || session.id, 60)}
        </CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs">
          <GitBranch size={9} />
          <span className="truncate">{truncate(session.branch, 20)}</span>
          <Cpu size={9} />
          <span>{modelLabel}</span>
          <Clock size={10} />
          {formatRelativeTime(session.startedAt)}
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

      <CardContent>
        <div className="hidden">{truncate(session.id, 8)}</div>
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground"></div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {session.taskClassification?.complexity && (
            <Chip
              size="sm"
              color={
                session.taskClassification.complexity === "low"
                  ? "success"
                  : session.taskClassification.complexity === "moderate"
                    ? "warning"
                    : "danger"
              }
            >
              {session.taskClassification.complexity}
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

        {/* Lifecycle Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground font-medium">
              Lifecycle Progress
            </span>
            {artifacts.length > 0 && (
              <span className="text-accent-foreground font-medium">
                {artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <ComplianceRing score={complianceScore} size="sm" />
            <PhaseStepper
              artifacts={artifacts}
              fastTrack={fastTrack}
              orientation="horizontal"
            />
          </div>
        </div>
        {session.tokenUsage && (
          <div className="text-[10px] text-muted-foreground font-mono">
            TID:{" "}
            {session.tokenUsage.inputTokens === 0
              ? "—"
              : `${(session.tokenUsage.outputTokens / session.tokenUsage.inputTokens).toFixed(1)}x`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
