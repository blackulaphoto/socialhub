import { useState } from "react";
import { Link } from "wouter";
import { 
  useAdminGetUsers,
  useAdminGetPosts,
  useAdminBanUser,
  useAdminUnbanUser,
  useAdminDeletePost
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Trash2, Ban, CheckCircle2, ShieldAlert } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [usersPage, setUsersPage] = useState(1);
  const [postsPage, setPostsPage] = useState(1);

  const { data: usersData, isLoading: isLoadingUsers } = useAdminGetUsers(
    { page: usersPage, limit: 20 },
    { query: { enabled: !!user?.isAdmin } }
  );

  const { data: postsData, isLoading: isLoadingPosts } = useAdminGetPosts(
    { page: postsPage, limit: 20 },
    { query: { enabled: !!user?.isAdmin } }
  );

  const { mutate: banUser, isPending: isBanning } = useAdminBanUser();
  const { mutate: unbanUser, isPending: isUnbanning } = useAdminUnbanUser();
  const { mutate: deletePost, isPending: isDeleting } = useAdminDeletePost();

  if (!user?.isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center text-muted-foreground max-w-md">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive/50" />
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p>You do not have permission to view the administration panel.</p>
          <Link href="/">
            <Button className="mt-6">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleToggleBan = (userId: number, isBanned: boolean) => {
    if (isBanned) {
      unbanUser(
        { userId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: "User Unbanned", description: "The user's account has been restored." });
          }
        }
      );
    } else {
      banUser(
        { userId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            toast({ title: "User Banned", description: "The user has been suspended from the platform.", variant: "destructive" });
          }
        }
      );
    }
  };

  const handleDeletePost = (postId: number) => {
    if (confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      deletePost(
        { postId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
            toast({ title: "Post Deleted", description: "The post was successfully removed." });
          }
        }
      );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:py-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
          <ShieldAlert className="text-primary w-8 h-8" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Manage users, moderate content, and oversee the platform.</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-8 bg-card/50 border border-border/50">
          <TabsTrigger value="users">Users Management</TabsTrigger>
          <TabsTrigger value="posts">Content Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-0">
              {isLoadingUsers ? (
                <div className="flex justify-center p-12"><Spinner size="lg" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users.map((u) => (
                      <TableRow key={u.id} className="border-border/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={u.avatarUrl || ""} />
                              <AvatarFallback>{u.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <Link href={`/profile/${u.id}`} className="font-medium hover:underline text-primary">
                              {u.username}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {u.profileType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.isBanned ? (
                            <Badge variant="destructive" className="bg-destructive/20 text-destructive border-transparent">Banned</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-transparent">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant={u.isBanned ? "outline" : "destructive"} 
                            size="sm"
                            onClick={() => handleToggleBan(u.id, u.isBanned)}
                            disabled={isBanning || isUnbanning || u.id === user.id}
                            className={u.isBanned ? "text-green-500 hover:text-green-600 hover:bg-green-500/10" : "hover:bg-destructive hover:text-destructive-foreground"}
                          >
                            {u.isBanned ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Ban className="w-4 h-4 mr-1" />}
                            {u.isBanned ? "Unban" : "Ban"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-0">
              {isLoadingPosts ? (
                <div className="flex justify-center p-12"><Spinner size="lg" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead>Author</TableHead>
                      <TableHead>Content Preview</TableHead>
                      <TableHead>Media</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {postsData?.posts.map((post) => (
                      <TableRow key={post.id} className="border-border/50">
                        <TableCell>
                          <Link href={`/profile/${post.userId}`} className="font-medium hover:underline text-primary">
                            {post.author.username}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-muted-foreground text-sm">
                          {post.content}
                        </TableCell>
                        <TableCell>
                          {post.imageUrl ? (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">Has Image</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="destructive" 
                            size="icon"
                            onClick={() => handleDeletePost(post.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
