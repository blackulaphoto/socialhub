import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetConversations,
  useGetMessages,
  useSendMessage,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/query-error-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { CalendarClock, ArrowLeft, MessageSquare, Send, Wallet, Link as LinkIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

function inquiryLabel(type: string | null | undefined) {
  if (!type) return null;
  return type.replace(/_/g, " ");
}

function inquiryTone(type: string | null | undefined) {
  if (!type) return "outline" as const;
  if (type === "book" || type === "hire") return "default" as const;
  return "secondary" as const;
}

export default function Messages({ conversationId }: { conversationId?: string }) {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: convData,
    isLoading: isLoadingConvs,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useGetConversations({
    query: { queryKey: ["/api/messages/conversations"] },
  });

  const activeConvId = conversationId ? parseInt(conversationId, 10) : undefined;

  const {
    data: messages,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    refetch: refetchMessages,
  } = useGetMessages(
    activeConvId as number,
    undefined,
    {
      query: {
        enabled: !!activeConvId,
        queryKey: ["/api/messages/conversations", activeConvId],
      },
    },
  );

  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const activeConversation = convData?.find((conversation) => conversation.id === activeConvId);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!activeConvId || !messages) return;
    queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  }, [activeConvId, messages, queryClient]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation) return;

    sendMessage(
      { data: { recipientId: activeConversation.otherUser.id, content: messageText.trim() } },
      {
        onSuccess: () => {
          setMessageText("");
          queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations", activeConvId] });
          queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
          queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        },
      },
    );
  };

  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const showList = !isMobile || !activeConvId;
  const showThread = !isMobile || activeConvId;

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden border-t border-border/50 bg-background md:h-[calc(100vh-4rem)]">
      {showList && (
        <div className={`${showThread ? "hidden md:flex" : "flex"} w-full flex-col border-r border-border/50 bg-card/30 md:w-80 lg:w-[26rem]`}>
          <div className="border-b border-border/50 px-4 py-4">
            <h2 className="text-xl font-bold">Inbox</h2>
            <p className="mt-1 text-sm text-muted-foreground">Direct messages and creator inquiries in one place.</p>
          </div>
          <ScrollArea className="flex-1">
            {isLoadingConvs ? (
              <div className="flex justify-center p-8"><Spinner /></div>
            ) : isConversationsError ? (
              <div className="p-4">
                <QueryErrorState title="Could not load inbox" description="The conversation list could not be loaded." onRetry={() => refetchConversations()} />
              </div>
            ) : convData?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-20" />
                No messages yet. Creator inquiries will land here too.
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {convData?.map((conv) => {
                  const inquiry = inquiryLabel(conv.inquiryType);
                  return (
                    <Link key={conv.id} href={`/messages/${conv.id}`}>
                      <div className={`rounded-xl border px-3 py-3 transition-colors ${activeConvId === conv.id ? "border-primary/40 bg-primary/10" : "border-transparent hover:border-border/50 hover:bg-accent/40"}`}>
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12 border border-border">
                            <AvatarImage src={conv.otherUser.avatarUrl || ""} />
                            <AvatarFallback>{conv.otherUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className={`truncate font-semibold ${conv.unreadCount > 0 ? "text-foreground" : ""}`}>{conv.otherUser.username}</h4>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {[conv.otherUser.category, conv.otherUser.city || conv.otherUser.location || conv.otherUser.profileType].filter(Boolean).join(" · ")}
                                </p>
                              </div>
                              {conv.lastMessageAt && (
                                <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                                  {new Date(conv.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {inquiry && (
                                <Badge variant={inquiryTone(conv.inquiryType)} className="text-[10px] uppercase tracking-[0.18em]">
                                  {inquiry}
                                </Badge>
                              )}
                              {conv.unreadCount > 0 && (
                                <Badge className="text-[10px]">{conv.unreadCount} new</Badge>
                              )}
                            </div>
                            <p className={`line-clamp-2 text-xs ${conv.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                              {conv.lastMessage || "Started a conversation"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {showThread && (
        <div className="relative z-0 flex w-full flex-1 flex-col bg-background">
          {activeConvId ? (
            <>
              <div className="sticky top-0 z-10 border-b border-border/50 bg-card/60 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 md:hidden"
                    onClick={() => setLocation("/messages")}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  {activeConversation && (
                    <>
                      <Link href={`/profile/${activeConversation.otherUser.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={activeConversation.otherUser.avatarUrl || ""} />
                          <AvatarFallback>{activeConversation.otherUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold leading-none">{activeConversation.otherUser.username}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[activeConversation.otherUser.category, activeConversation.otherUser.city || activeConversation.otherUser.location || activeConversation.otherUser.profileType].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </Link>
                      {activeConversation.inquiryType && (
                        <Badge variant={inquiryTone(activeConversation.inquiryType)} className="ml-auto text-[10px] uppercase tracking-[0.18em]">
                          {inquiryLabel(activeConversation.inquiryType)}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex justify-center p-8"><Spinner /></div>
                ) : isMessagesError ? (
                  <div className="mx-auto max-w-3xl">
                    <QueryErrorState title="Could not load conversation" description="This thread could not be loaded right now." onRetry={() => refetchMessages()} />
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-4 pb-4">
                    {messages?.map((msg) => {
                      const isMe = msg.senderId === currentUser?.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          {msg.inquiry && (
                            <Card className={`mb-2 max-w-[80%] border-primary/25 bg-primary/10 ${isMe ? "self-end" : "self-start"}`}>
                              <CardContent className="space-y-3 p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="text-[10px] uppercase tracking-[0.18em]">
                                    {inquiryLabel(msg.inquiry.inquiryType) || "Inquiry"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">Structured inquiry details</span>
                                </div>
                                <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                                  {msg.inquiry.eventType && <div><span className="font-medium text-foreground">Type:</span> {msg.inquiry.eventType}</div>}
                                  {msg.inquiry.eventDate && <div><span className="font-medium text-foreground">Date:</span> {msg.inquiry.eventDate}</div>}
                                  {msg.inquiry.budget && <div><span className="font-medium text-foreground">Budget:</span> {msg.inquiry.budget}</div>}
                                  {msg.inquiry.externalUrl && (
                                    <div className="min-w-0">
                                      <span className="font-medium text-foreground">Link:</span>{" "}
                                      <a href={msg.inquiry.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                        Open <LinkIcon className="h-3 w-3" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                                {msg.inquiry.projectDetails && (
                                  <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground">
                                    {msg.inquiry.projectDetails}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}
                          {msg.isBookingInquiry && !msg.inquiry && (
                            <div className={`mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${isMe ? "text-primary" : "text-muted-foreground"}`}>
                              <CalendarClock className="h-3 w-3" /> Inquiry
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              msg.isBookingInquiry
                                ? "border border-primary/30 bg-primary/20 text-foreground"
                                : isMe
                                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                                  : "rounded-tl-sm bg-secondary text-secondary-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
                            {msg.inquiry?.budget && <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" /> {msg.inquiry.budget}</span>}
                            <span>{new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="border-t border-border/50 bg-card/80 p-4 backdrop-blur-md">
                <form onSubmit={handleSend} className="mx-auto flex max-w-3xl gap-2">
                  <Input
                    placeholder={activeConversation?.inquiryType ? "Reply to this inquiry..." : "Type a message..."}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="h-11 flex-1 rounded-full border-border/50 bg-background/50 px-4"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full"
                    disabled={!messageText.trim() || isSending}
                  >
                    <Send className="ml-0.5 h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="mb-4 h-16 w-16 opacity-10" />
              <p className="text-lg font-medium text-foreground">Your inbox</p>
              <p className="text-sm">Select a conversation to continue a message or inquiry.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
