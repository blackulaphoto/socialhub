import {
  useReactToProfile,
  useRemoveProfileReaction,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { SmilePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "heart", emoji: "❤️", label: "Heart" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "angry", emoji: "😠", label: "Angry" },
] as const;

type ReactionSummary = {
  total: number;
  counts: {
    like: number;
    heart: number;
    wow: number;
    angry: number;
  };
  currentUserReaction?: string | null;
};

export function ProfileReactionBar({
  userId,
  summary,
  invalidateKeys,
}: {
  userId: number;
  summary?: ReactionSummary | null;
  invalidateKeys: Array<readonly unknown[]>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const react = useReactToProfile();
  const removeReaction = useRemoveProfileReaction();

  const refresh = () => {
    for (const key of invalidateKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const handleReact = (reactionType: (typeof REACTIONS)[number]["type"]) => {
    react.mutate(
      { userId, data: { reactionType } },
      {
        onSuccess: refresh,
        onError: () => toast({ title: "Could not react", variant: "destructive" }),
      },
    );
  };

  const handleRemove = () => {
    removeReaction.mutate(
      { userId },
      {
        onSuccess: refresh,
        onError: () => toast({ title: "Could not remove reaction", variant: "destructive" }),
      },
    );
  };

  const current = REACTIONS.find((reaction) => reaction.type === summary?.currentUserReaction);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={current ? "default" : "outline"}>
            <SmilePlus className="mr-2 h-4 w-4" />
            {current ? `${current.emoji} ${current.label}` : "React"}
            {summary?.total ? <span className="ml-2 text-xs opacity-80">{summary.total}</span> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {REACTIONS.map((reaction) => (
            <DropdownMenuItem key={reaction.type} onClick={() => handleReact(reaction.type)}>
              <span className="mr-2">{reaction.emoji}</span>
              {reaction.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {current ? (
        <Button variant="ghost" size="sm" onClick={handleRemove}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {REACTIONS.filter((reaction) => Number(summary?.counts?.[reaction.type] || 0) > 0).map((reaction) => (
          <Badge key={reaction.type} variant="secondary">
            {reaction.emoji} {summary?.counts?.[reaction.type] || 0}
          </Badge>
        ))}
      </div>
    </div>
  );
}
