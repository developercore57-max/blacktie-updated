import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useResellerGetChatMessages, useResellerGetChatThread, useResellerPostChatMessage, type ChatMessage } from "@workspace/api-client-react";

export default function ResellerChat() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: thread } = useResellerGetChatThread({ query: { staleTime: 30_000 } });
  const { data: messages = [], isLoading } = useResellerGetChatMessages({ query: { refetchInterval: 3000, staleTime: 0 } });
  const postMessage = useResellerPostChatMessage();
  const [text, setText] = useState("");
  const list = useMemo(() => (messages as ChatMessage[]).slice().reverse(), [messages]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list.length]);

  const lastMessageIsFromReseller = list.length > 0 && list[list.length - 1]?.authorRole === "reseller";

  const send = async () => {
    if (!text.trim()) return;
    try {
      await postMessage.mutateAsync({ data: { message: text.trim() } });
      setText("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    } catch (err: any) {
      toast({ title: "Failed to send", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  return (
    <AppLayout role="reseller" title="Chat">
      <div className="max-w-3xl">
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-muted/10">
            <div>
              <div className="text-sm font-bold">{thread?.subject ?? "Support Chat"}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Messages with Black Tie VoIP support</div>
            </div>
            {lastMessageIsFromReseller && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 rounded-full px-3 py-1">
                <Clock className="w-3 h-3" />
                Awaiting reply
              </div>
            )}
          </div>

          <div className="p-5 flex flex-col">
            {/* Message list */}
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-12 text-center">Loading messages…</div>
            ) : list.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-2xl mb-3">💬</div>
                <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Send a message below to start chatting with our support team</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 mb-4">
                {list.map((m) => (
                  <div key={m.id} className={`flex ${m.authorRole === "reseller" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 border ${
                        m.authorRole === "reseller"
                          ? "bg-primary text-primary-foreground border-primary/20"
                          : "bg-muted/10 text-foreground border-border/60"
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1 flex items-center justify-between gap-3">
                        <span className="font-semibold">{m.authorRole === "reseller" ? "You" : "Support"}</span>
                        <span>{format(new Date(m.createdAt), "dd MMM, HH:mm")}</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{m.message}</div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}

            {/* Input */}
            <div className="pt-4 border-t border-border/60 flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Type a message to support…"
              />
              <button
                type="button"
                onClick={send}
                disabled={postMessage.isPending || !text.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
