import { useBlockUser, useUnblockUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type BlockState = {
  hasBlockedUser: boolean;
  isBlockedByUser: boolean;
  isBlockedEitherWay: boolean;
};

export function BlockActionButton({
  userId,
  blockState,
  invalidateKeys,
}: {
  userId: number;
  blockState?: BlockState | null;
  invalidateKeys: Array<readonly unknown[]>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  const refresh = () => {
    for (const key of invalidateKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
  };

  if (!blockState) return null;

  if (blockState.hasBlockedUser) {
    return (
      <Button
        variant="outline"
        onClick={() => unblockUser.mutate(
          { userId },
          {
            onSuccess: refresh,
            onError: () => toast({ title: "Could not unblock user", variant: "destructive" }),
          },
        )}
      >
        <ShieldOff className="mr-2 h-4 w-4" />
        Unblock
      </Button>
    );
  }

  if (blockState.isBlockedByUser) {
    return (
      <Button variant="outline" disabled>
        <Ban className="mr-2 h-4 w-4" />
        Blocked You
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => {
        if (!window.confirm("Block this user? This removes follows/friend connections and stops further interaction.")) {
          return;
        }
        blockUser.mutate(
          { userId },
          {
            onSuccess: refresh,
            onError: () => toast({ title: "Could not block user", variant: "destructive" }),
          },
        );
      }}
    >
      <Ban className="mr-2 h-4 w-4" />
      Block
    </Button>
  );
}
