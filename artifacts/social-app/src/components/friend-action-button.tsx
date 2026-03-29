import {
  useAcceptFriendRequest,
  useRemoveFriend,
  useSendFriendRequest,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { UserRoundPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type FriendshipState = {
  id?: number | null;
  status: "self" | "none" | "outgoing" | "incoming" | "friends";
  isFriend: boolean;
};

export function FriendActionButton({
  userId,
  friendship,
  invalidateKeys,
}: {
  userId: number;
  friendship?: FriendshipState | null;
  invalidateKeys: Array<readonly unknown[]>;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const removeFriend = useRemoveFriend();

  const refresh = () => {
    for (const key of invalidateKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  if (!friendship || friendship.status === "self") {
    return null;
  }

  if (friendship.status === "incoming") {
    return (
      <Button
        variant="default"
        onClick={() => acceptRequest.mutate(
          { userId },
          {
            onSuccess: refresh,
            onError: () => toast({ title: "Could not accept request", variant: "destructive" }),
          },
        )}
      >
        <Users className="mr-2 h-4 w-4" />
        Accept Friend
      </Button>
    );
  }

  if (friendship.status === "friends") {
    return (
      <Button
        variant="outline"
        onClick={() => removeFriend.mutate(
          { userId },
          {
            onSuccess: refresh,
            onError: () => toast({ title: "Could not remove friend", variant: "destructive" }),
          },
        )}
      >
        <Users className="mr-2 h-4 w-4" />
        Friends
      </Button>
    );
  }

  if (friendship.status === "outgoing") {
    return (
      <Button
        variant="outline"
        onClick={() => removeFriend.mutate(
          { userId },
          {
            onSuccess: refresh,
            onError: () => toast({ title: "Could not cancel request", variant: "destructive" }),
          },
        )}
      >
        <UserRoundPlus className="mr-2 h-4 w-4" />
        Request Sent
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      onClick={() => sendRequest.mutate(
        { userId },
        {
          onSuccess: refresh,
          onError: () => toast({ title: "Could not send friend request", variant: "destructive" }),
        },
      )}
    >
      <UserRoundPlus className="mr-2 h-4 w-4" />
      Add Friend
    </Button>
  );
}
