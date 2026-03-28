import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetConversations, 
  useGetMessages, 
  useSendMessage 
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Send, ArrowLeft, MessageSquare, CalendarClock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

export default function Messages({ conversationId }: { conversationId?: string }) {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: convData, isLoading: isLoadingConvs } = useGetConversations({
    query: { queryKey: ["/api/messages/conversations"] }
  });

  const activeConvId = conversationId ? parseInt(conversationId) : undefined;
  
  const { data: messages, isLoading: isLoadingMessages } = useGetMessages(
    activeConvId as number,
    { 
      query: { 
        enabled: !!activeConvId,
        queryKey: ["/api/messages/conversations", activeConvId]
      } 
    }
  );

  const { mutate: sendMessage, isPending: isSending } = useSendMessage();

  const activeConversation = convData?.find(c => c.id === activeConvId);

  useEffect(() => {
    // Scroll to bottom when messages load or change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation) return;

    sendMessage(
      { data: { recipientId: activeConversation.otherUser.id, content: messageText } },
      {
        onSuccess: () => {
          setMessageText("");
          queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations", activeConvId] });
          queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
        }
      }
    );
  };

  const isMobile = window.innerWidth < 768; // simple check, ideally use a hook
  const showList = !isMobile || !activeConvId;
  const showThread = !isMobile || activeConvId;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen w-full bg-background overflow-hidden border-t border-border/50 md:border-none">
      
      {/* Conversations List */}
      {showList && (
        <div className={`${showThread ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-border/50 bg-card/30`}>
          <div className="p-4 border-b border-border/50 flex-shrink-0">
            <h2 className="text-xl font-bold">Messages</h2>
          </div>
          <ScrollArea className="flex-1">
            {isLoadingConvs ? (
              <div className="flex justify-center p-8"><Spinner /></div>
            ) : convData?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
                No messages yet
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {convData?.map(conv => (
                  <Link key={conv.id} href={`/messages/${conv.id}`}>
                    <div className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${activeConvId === conv.id ? 'bg-primary/10' : 'hover:bg-accent/50'}`}>
                      <Avatar className="w-12 h-12 border border-border">
                        <AvatarImage src={conv.otherUser.avatarUrl || ""} />
                        <AvatarFallback>{conv.otherUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className={`font-semibold truncate ${conv.unreadCount > 0 ? 'text-foreground' : ''}`}>{conv.otherUser.username}</h4>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                              {new Date(conv.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                            {conv.lastMessage || "Started a conversation"}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Message Thread */}
      {showThread && (
        <div className="flex-1 flex flex-col w-full bg-background relative z-0">
          {activeConvId ? (
            <>
              {/* Thread Header */}
              <div className="h-16 border-b border-border/50 flex items-center px-4 gap-3 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden shrink-0" 
                  onClick={() => setLocation("/messages")}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {activeConversation && (
                  <Link href={`/profile/${activeConversation.otherUser.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarImage src={activeConversation.otherUser.avatarUrl || ""} />
                      <AvatarFallback>{activeConversation.otherUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold leading-none">{activeConversation.otherUser.username}</h3>
                      <p className="text-xs text-muted-foreground capitalize mt-1">{activeConversation.otherUser.profileType}</p>
                    </div>
                  </Link>
                )}
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                {isLoadingMessages ? (
                  <div className="flex justify-center p-8"><Spinner /></div>
                ) : (
                  <div className="space-y-4 max-w-3xl mx-auto pb-4">
                    {messages?.map(msg => {
                      const isMe = msg.senderId === currentUser?.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {msg.isBookingInquiry && (
                            <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 flex items-center gap-1 ${isMe ? 'text-primary' : 'text-muted-foreground'}`}>
                              <CalendarClock className="w-3 h-3" /> Booking Inquiry
                            </div>
                          )}
                          <div 
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              msg.isBookingInquiry 
                                ? 'bg-primary/20 border border-primary/30 text-foreground'
                                : isMe 
                                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                                  : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 bg-card/80 border-t border-border/50 backdrop-blur-md">
                <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 bg-background/50 border-border/50 rounded-full px-4 h-11"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="rounded-full h-11 w-11 shrink-0" 
                    disabled={!messageText.trim() || isSending}
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg font-medium text-foreground">Your Messages</p>
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
