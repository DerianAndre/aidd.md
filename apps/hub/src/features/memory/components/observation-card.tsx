import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { formatRelativeTime } from "../../../lib/utils";
import type { SessionObservation, ObservationType } from "../../../lib/types";

const TYPE_COLORS: Record<
  ObservationType,
  "accent" | "success" | "warning" | "danger" | "default"
> = {
  decision: "accent",
  mistake: "danger",
  convention: "success",
  pattern: "default",
  preference: "default",
  insight: "accent",
  tool_outcome: "warning",
  workflow_outcome: "success",
};

interface ObservationCardProps {
  observation: SessionObservation;
  onEdit?: (observation: SessionObservation) => void;
  onDelete?: (id: string) => void;
}

export function ObservationCard({ observation, onEdit, onDelete }: ObservationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    observation.narrative ||
    (observation.facts && observation.facts.length > 0);

  return (
    <Card className="group border border-border bg-muted/50 gap-2">
      <CardHeader
        className="cursor-pointer"
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="flex w-full items-start gap-2">
          {hasDetails && (
            <span className="mt-0.5 text-muted-foreground">
              {expanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </span>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Chip size="sm" color={TYPE_COLORS[observation.type]}>
                {observation.type.replace("_", " ")}
              </Chip>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(observation.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">
              {observation.title}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onEdit(observation); }}
              >
                <Pencil size={14} />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(observation.id); }}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && hasDetails && (
        <CardContent className="pt-0">
          {observation.facts && observation.facts.length > 0 && (
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {observation.facts.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
          )}

          {observation.narrative && (
            <p className="mb-2 text-xs text-muted-foreground">
              {observation.narrative}
            </p>
          )}

          {observation.concepts && observation.concepts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {observation.concepts.map((c) => (
                <Chip key={c} size="sm" color="default">
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
