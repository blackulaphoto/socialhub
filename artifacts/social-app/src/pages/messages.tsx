import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetConversations,
  useGetMessages,
  useGetSuggestedCreators,
  useSearch,
  useSendMessage,
} from "@workspace/api-client-react";
import { ArrowLeft, CalendarClock, Link as LinkIcon, MessageSquare, Plus, Search, Send, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/query-error-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [isWindowVisible, setIsWindowVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState === "visible",
  );
  const [messageText, setMessageText] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeQuery, setComposeQuery] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: number;
    name: string;
    avatarUrl?: string | null;
    subtitle?: string | null;
  } | null>(null);
  const [inboxView, setInboxView] = useState<"all" | "messages" | "inquiries">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: convData,
    isLoading: isLoadingConvs,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useGetConversations({
    query: {
      queryKey: ["/api/messages/conversations"],
      refetchInterval: isWindowVisible ? 5000 : 15000,
      refetchOnWindowFocus: true,
    },
  });

  const activeConvId = conversationId ? parseInt(conversationId, 10) : undefined;

  const {
    data: messages,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    refetch: refetchMessages,
  } = useGetMessages(activeConvId as number, undefined, {
    query: {
      enabled: !!activeConvId,
      queryKey: ["/api/messages/conversations", activeConvId],
      refetchInterval: activeConvId ? (isWindowVisible ? 2500 : 10000) : false,
      refetchOnWindowFocus: true,
    },
  });

  const { data: suggestedCreators } = useGetSuggestedCreators(
    currentUser?.id || 0,
    { limit: 6 },
    {
      query: {
        enabled: !!currentUser?.id,
        queryKey: ["suggested-creators", "messages", currentUser?.id],
      },
    },
  );

  const { data: searchResults, isLoading: isSearchingRecipients } = useSearch(
    { q: composeQuery || undefined, type: "all", limit: 8 },
    {
      query: {
        enabled: isComposeOpen && composeQuery.trim().length > 1,
        queryKey: ["message-recipient-search", composeQuery],
      },
    },
  );

  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const activeConversation = convData?.find((conversation) => conversation.id === activeConvId);

  const inboxCounts = useMemo(() => {
    const conversations = convData || [];
    const inquiries = conversations.filter((conversation) => Boolean(conversation.inquiryType)).length;
    return {
      all: conversations.length,
      inquiries,
      messages: conversations.length - inquiries,
    };
  }, [convData]);

  const visibleConversations = useMemo(() => {
    const conversations = convData || [];
    if (inboxView === "inquiries") return conversations.filter((conversation) => Boolean(conversation.inquiryType));
    if (inboxView === "messages") return conversations.filter((conversation) => !conversation.inquiryType);
    return conversations;
  }, [convData, inboxView]);

  const latestOwnMessageId = useMemo(() => {
    if (!messages || !currentUser?.id) return null;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].senderId === currentUser.id) return messages[index].id;
    }
    return null;
  }, [currentUser?.id, messages]);

  const recipientOptions = useMemo(() => {
    const byId = new Map<number, { id: number; name: string; avatarUrl?: string | null; subtitle?: string | null }>();

    for (const artist of suggestedCreators?.artists || []) {
      if (!artist.userId || artist.userId === currentUser?.id) continue;
      byId.set(artist.userId, {
        id: artist.userId,
        name: artist.displayName || artist.user.username,
        avatarUrl: artist.avatarUrl || artist.user.avatarUrl || null,
        subtitle: [artist.category, artist.location].filter(Boolean).join(" · ") || "Suggested artist",
      });
    }

    for (const artist of searchResults?.artists || []) {
      if (!artist.userId || artist.userId === currentUser?.id) continue;
      byId.set(artist.userId, {
        id: artist.userId,
        name: artist.displayName || artist.user.username,
        avatarUrl: artist.avatarUrl || artist.user.avatarUrl || null,
        subtitle: [artist.category, artist.location].filter(Boolean).join(" · ") || "Artist page",
      });
    }

    for (const person of searchResults?.users || []) {
      if (!person.id || person.id === currentUser?.id) continue;
      if (!byId.has(person.id)) {
        byId.set(person.id, {
          id: person.id,
          name: person.username,
          avatarUrl: person.avatarUrl || null,
          subtitle: [person.city || person.location, "artist page"].filter(Boolean).join(" · "),
        });
      }
    }

    return Array.from(byId.values());
  }, [currentUser?.id, searchResults?.artists, searchResults?.users, suggestedCreators?.artists]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handleVisibilityChange = () => setIsWindowVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!activeConvId || !messages) return;
    queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
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

  const handleStartConversation = () => {
    if (!selectedRecipient || !composeMessage.trim()) return;
    sendMessage(
      { data: { recipientId: selectedRecipient.id, content: composeMessage.trim() } },
      {
        onSuccess: async () => {
          setComposeMessage("");
          setComposeQuery("");
          setIsComposeOpen(false);
          const refreshed = await refetchConversations();
          const updatedConversations = refreshed.data || [];
          const conversation = updatedConversations.find((item) => item.otherUser.id === selectedRecipient.id);
          setSelectedRecipient(null);
          queryClient.invalidateQueries({ queryKey: ["/api/activity/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
          setLocation(conversation ? `/messages/${conversation.id}` : "/messages");
          toast({ title: "Message sent", description: `Conversation started with ${selectedRecipient.name}.` });
        },
        onError: () => toast({ title: "Could not send message", description: "Try again in a moment.", variant: "destructive" }),
      },
    );
  };

  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const showList = !isMobile || !activeConvId;
  const showThread = !isMobile || activeConvId;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="hh-page-kicker">Inquiries · {inboxCounts.inquiries} open</div>
          <h1 className="hh-page-title mt-3 !text-[clamp(2.2rem,5vw,3.5rem)]">
            Your <span className="hh-brand-wordmark-accent">desk.</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-none">Mark all read</Button>
          <Button variant="outline" className="rounded-none">Archive</Button>
          <Button className="hh-solid-btn rounded-none" onClick={() => setIsComposeOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New message
          </Button>
        </div>
      </section>

      <section className="hh-messages-shell">
        {showList ? (
          <aside className={`${showThread ? "hidden md:block" : "block"} hh-messages-pane border-r`}>
            <div className="border-b border-[var(--hh-rule-soft)] p-4">
              <div className="flex items-center gap-2 border border-[var(--hh-rule)] bg-[color:color-mix(in_srgb,white_2%,transparent)] px-3 py-2">
                <Search className="h-4 w-4 text-[var(--hh-ink-muted)]" />
                <span className="text-sm text-[var(--hh-ink-muted)]">Search threads…</span>
              </div>
              <div className="mt-4 flex gap-4 border-b border-[var(--hh-rule-soft)]">
                {([
                  { key: "all", label: "All", count: inboxCounts.all },
                  { key: "messages", label: "Messages", count: inboxCounts.messages },
                  { key: "inquiries", label: "Inquiries", count: inboxCounts.inquiries },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setInboxView(item.key)}
                    className={`hh-tabstrip-item ${inboxView === item.key ? "is-active" : ""}`}
                  >
                    {item.label}
                    <span className="hh-tabstrip-badge">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="h-[62vh] md:h-[70vh]">
              {isLoadingConvs ? (
                <div className="flex justify-center p-8"><Spinner /></div>
              ) : isConversationsError ? (
                <div className="p-4">
                  <QueryErrorState title="Could not load inbox" description="The conversation list could not be loaded." onRetry={() => refetchConversations()} />
                </div>
              ) : visibleConversations.length ? (
                <div>
                  {visibleConversations.map((conv) => (
                    <Link key={conv.id} href={`/messages/${conv.id}`} className={`hh-thread-item ${activeConvId === conv.id ? "is-active" : ""}`}>
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={conv.otherUser.avatarUrl || ""} />
                        <AvatarFallback>{conv.otherUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className={`truncate text-sm ${conv.unreadCount > 0 ? "font-semibold text-[var(--hh-ink)]" : "text-[var(--hh-ink)]"}`}>
                              {conv.otherUser.username}
                            </div>
                            <div className="mt-1 truncate text-[10px] uppercase tracking-[0.12em] text-[var(--hh-ink-muted)]">
                              {[conv.otherUser.category, conv.otherUser.city || conv.otherUser.location || conv.otherUser.profileType].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          {conv.lastMessageAt ? (
                            <span className="hh-rail-count">
                              {new Date(conv.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {conv.inquiryType ? <Badge variant={inquiryTone(conv.inquiryType)} className="rounded-none text-[10px] uppercase tracking-[0.16em]">{inquiryLabel(conv.inquiryType)}</Badge> : null}
                          {conv.unreadCount > 0 ? <Badge className="rounded-none text-[10px]">{conv.unreadCount} new</Badge> : null}
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--hh-ink-muted)]">{conv.lastMessage || "Started a conversation"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-[var(--hh-ink-muted)]">
                  <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-20" />
                  No threads here yet.
                </div>
              )}
            </ScrollArea>
          </aside>
        ) : null}

        {showThread ? (
          <main className="hh-messages-pane min-w-0 border-r">
            {activeConvId ? (
              <div className="flex h-full flex-col">
                <header className="border-b border-[var(--hh-rule-soft)] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setLocation("/messages")}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    {activeConversation ? (
                      <>
                        <Link href={`/artists/${activeConversation.otherUser.id}`} className="min-w-0">
                          <div className="font-serif text-2xl text-[var(--hh-ink)]">
                            {activeConversation.inquiryType ? `${inquiryLabel(activeConversation.inquiryType)} · ` : ""}
                            <span className="hh-brand-wordmark-accent">{activeConversation.otherUser.username}</span>
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--hh-ink-muted)]">
                            {[activeConversation.otherUser.category, activeConversation.otherUser.city || activeConversation.otherUser.location || activeConversation.otherUser.profileType].filter(Boolean).join(" · ")}
                          </div>
                        </Link>
                        {activeConversation.inquiryType ? <Badge variant={inquiryTone(activeConversation.inquiryType)} className="ml-auto rounded-none">{inquiryLabel(activeConversation.inquiryType)}</Badge> : null}
                      </>
                    ) : null}
                  </div>
                </header>

                <ScrollArea className="flex-1 px-5 py-5">
                  <div className="mx-auto max-w-3xl space-y-5">
                    {activeConversation?.inquiryType ? (
                      <div className="hh-inquiry-brief">
                        <div className="hh-rail-kicker">Structured inquiry · pinned</div>
                        <div className="mt-4 hh-brief-grid">
                          <div>
                            <div className="hh-rail-count">Project</div>
                            <div className="mt-1 text-sm text-[var(--hh-ink)]">{inquiryLabel(activeConversation.inquiryType)}</div>
                          </div>
                          <div>
                            <div className="hh-rail-count">Replies</div>
                            <div className="mt-1 text-sm text-[var(--hh-ink)]">Typically within a few hours</div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {isLoadingMessages ? (
                      <div className="flex justify-center p-8"><Spinner /></div>
                    ) : isMessagesError ? (
                      <QueryErrorState title="Could not load conversation" description="This thread could not be loaded right now." onRetry={() => refetchMessages()} />
                    ) : (
                      <>
                        {messages?.map((msg) => {
                          const isMe = msg.senderId === currentUser?.id;
                          return (
                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[85%] border px-4 py-3 ${isMe ? "border-[var(--hh-accent)]" : "border-[var(--hh-rule)] bg-[color:color-mix(in_srgb,white_2%,transparent)]"}`}>
                                {msg.inquiry ? (
                                  <div className="mb-3 border-b border-[var(--hh-rule-soft)] pb-3">
                                    <Badge variant={inquiryTone(msg.inquiry.inquiryType)} className="rounded-none text-[10px] uppercase tracking-[0.16em]">
                                      {inquiryLabel(msg.inquiry.inquiryType) || "Inquiry"}
                                    </Badge>
                                    <div className="mt-3 grid gap-2 text-sm text-[var(--hh-ink-muted)] md:grid-cols-2">
                                      {msg.inquiry.eventType ? <div><span className="text-[var(--hh-ink)]">Type:</span> {msg.inquiry.eventType}</div> : null}
                                      {msg.inquiry.eventDate ? <div><span className="text-[var(--hh-ink)]">Date:</span> {msg.inquiry.eventDate}</div> : null}
                                      {msg.inquiry.budget ? <div><span className="text-[var(--hh-ink)]">Budget:</span> {msg.inquiry.budget}</div> : null}
                                      {msg.inquiry.externalUrl ? (
                                        <div>
                                          <a href={msg.inquiry.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--hh-accent)] hover:underline">
                                            Open link <LinkIcon className="h-3 w-3" />
                                          </a>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}
                                {msg.isBookingInquiry && !msg.inquiry ? (
                                  <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--hh-accent)]">
                                    <CalendarClock className="h-3 w-3" /> Inquiry
                                  </div>
                                ) : null}
                                <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--hh-ink)]">{msg.content}</p>
                                <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--hh-ink-muted)]">
                                  {msg.inquiry?.budget ? <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" />{msg.inquiry.budget}</span> : null}
                                  <span>{new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                                  {isMe && msg.id === latestOwnMessageId ? <span>{msg.isRead ? "Seen" : "Sent"}</span> : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                </ScrollArea>

                <div className="border-t border-[var(--hh-rule-soft)] p-5">
                  <form onSubmit={handleSend} className="mx-auto max-w-3xl">
                    <div className="hh-composer-shell">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="hh-rail-count">Reply</span>
                        <div className="flex gap-3 text-[10px] uppercase tracking-[0.12em] text-[var(--hh-ink-muted)]">
                          <span>Attach</span>
                          <span>Reference</span>
                        </div>
                      </div>
                      <Textarea
                        placeholder={activeConversation?.inquiryType ? "Reply to this inquiry..." : "Type a message..."}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="min-h-28 rounded-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                      />
                      <div className="mt-3 flex justify-end">
                        <Button type="submit" className="hh-solid-btn rounded-none" disabled={!messageText.trim() || isSending}>
                          <Send className="mr-2 h-4 w-4" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-[var(--hh-ink-muted)]">
                <MessageSquare className="mb-4 h-16 w-16 opacity-10" />
                <p className="font-serif text-3xl text-[var(--hh-ink)]">Your inbox</p>
                <p className="mt-2 text-sm">Select a thread to continue a conversation.</p>
              </div>
            )}
          </main>
        ) : null}

        <aside className="hidden p-5 md:block">
          {activeConversation ? (
            <div className="space-y-5">
              <div>
                <div className="hh-rail-kicker">Sender dossier</div>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border/50">
                    <AvatarImage src={activeConversation.otherUser.avatarUrl || ""} />
                    <AvatarFallback>{activeConversation.otherUser.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-serif text-2xl text-[var(--hh-ink)]">{activeConversation.otherUser.username}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--hh-ink-muted)]">
                      {[activeConversation.otherUser.category, activeConversation.otherUser.city || activeConversation.otherUser.location || activeConversation.otherUser.profileType].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/artists/${activeConversation.otherUser.id}`}><Button variant="outline" size="sm" className="rounded-none">Artist page</Button></Link>
                  <Button variant="outline" size="sm" className="rounded-none">Follow</Button>
                </div>
              </div>

              <div className="border-t border-[var(--hh-rule-soft)] pt-4">
                {[
                  ["Identity", "Visible on profile"],
                  ["References", "Shown on page"],
                  ["Reply average", "Recent activity based"],
                  ["Safety", "Use the Safety Center if needed"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-t border-[var(--hh-rule-soft)] py-3 first:border-t-0 first:pt-0">
                    <div className="hh-rail-count">{label}</div>
                    <div className="text-right text-sm text-[var(--hh-ink)]">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[var(--hh-ink-muted)]">Open a thread to see the sender context here.</div>
          )}
        </aside>
      </section>

      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Start a new conversation</DialogTitle>
            <DialogDescription>Search for an artist or person, then send the first message from here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search people or artists..." className="pl-9" value={composeQuery} onChange={(e) => setComposeQuery(e.target.value)} />
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {isSearchingRecipients ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : recipientOptions.length ? recipientOptions.map((recipient) => (
                <button
                  key={recipient.id}
                  type="button"
                  onClick={() => setSelectedRecipient(recipient)}
                  className={`flex w-full items-center gap-3 border px-3 py-3 text-left ${selectedRecipient?.id === recipient.id ? "border-primary/50 bg-primary/10" : "border-border/50 bg-card/28 hover:border-primary/30"}`}
                >
                  <Avatar className="h-11 w-11 border border-border">
                    <AvatarImage src={recipient.avatarUrl || ""} />
                    <AvatarFallback>{recipient.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{recipient.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{recipient.subtitle || "member"}</div>
                  </div>
                </button>
              )) : (
                <div className="border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
                  {composeQuery.trim().length > 1 ? "No people matched that search yet." : "Suggested artists and recent matches will show up here."}
                </div>
              )}
            </div>

            {selectedRecipient ? (
              <div className="border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 text-sm font-medium">Message {selectedRecipient.name}</div>
                <Textarea placeholder="Write the first message..." value={composeMessage} onChange={(e) => setComposeMessage(e.target.value)} />
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setIsComposeOpen(false); setComposeQuery(""); setComposeMessage(""); setSelectedRecipient(null); }}>Cancel</Button>
              <Button type="button" onClick={handleStartConversation} disabled={!selectedRecipient || !composeMessage.trim() || isSending}>
                <Send className="mr-2 h-4 w-4" />
                Send message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
