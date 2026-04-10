import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  useAdminGetChatThreadMessages,
  useAdminGetChatThreads,
  useAdminPostChatMessage,
  type AdminChatThread,
  type ChatMessage,
} from "@workspace/api-client-react";

function threadHasMessages(t: AdminChatThread) {
  return !!t.lastMessageAuthor;
}

function threadDate(t: AdminChatThread): string {
  if (!t.updatedAt) return "";
  const d = new Date(t.updatedAt);
  if (d.getFullYear() < 2000) return "";
  return format(d, "dd MMM");
}

export default function AdminChat() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: threads = [], isLoading: threadsLoading } = useAdminGetChatThreads({ query: { refetchInterval: 4000, staleTime: 0 } });
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);

  const { data: messages = [], isLoading: messagesLoading } = useAdminGetChatThreadMessages(selectedThreadId ?? 0, {
    query: { enabled: !!selectedThreadId, refetchInterval: 3000, staleTime: 0 },
  });

  const postMessage = useAdminPostChatMessage();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [readThreadIds, setReadThreadIds] = useState<Set<number>>(new Set());

  const selectedThread = useMemo(
    () => (threads as AdminChatThread[]).find((t) => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  const list = useMemo(() => (messages as ChatMessage[]).slice().reverse(), [messages]);

  // Auto-select the first thread that has messages; fall back to first thread
  useEffect(() => {
    if (!selectedThreadId && (threads as AdminChatThread[]).length > 0) {
      const threadList = threads as AdminChatThread[];
      const withMessages = threadList.find(threadHasMessages);
      setSelectedThreadId((withMessages ?? threadList[0]).id);
    }
  }, [threads, selectedThreadId]);

  useEffect(() => {
    if (selectedThreadId) {
      setReadThreadIds((prev) => new Set([...prev, selectedThreadId]));
    }
  }, [selectedThreadId, list.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list.length]);

  const selectThread = (id: number) => {
    setSelectedThreadId(id);
    setReadThreadIds((prev) => new Set([...prev, id]));
    queryClient.invalidateQueries({ queryKey: [`/api/admin/chat/threads/${id}/messages`] });
  };

  const send = async () => {
    if (!selectedThreadId) return;
    if (!text.trim()) return;
    try {
      await postMessage.mutateAsync({ threadId: selectedThreadId, data: { message: text.trim() } });
      setText("");
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chat/threads/${selectedThreadId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/threads"] });
    } catch (err: any) {
      toast({ title: "Failed to send", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  const threadList = threads as AdminChatThread[];

  return (
    <AppLayout role="admin" title="Chat">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* ── Thread list ── */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/10 shrink-0">
            <div className="text-sm font-bold">Conversations</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {threadList.length === 0 ? "No resellers yet" : `${threadList.length} reseller${threadList.length !== 1 ? "s" : ""}`}
            </div>
          </div>
          <div className="divide-y divide-border/50 overflow-y-auto flex-1">
            {threadsLoading ? (
              <div className="p-5 text-sm text-muted-foreground">Loading…</div>
            ) : threadList.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">No active resellers found.</div>
            ) : (
              threadList.map((t) => {
                const active = t.id === selectedThreadId;
                const hasUnread = t.lastMessageAuthor === "reseller" && !readThreadIds.has(t.id);
                const hasMsg = threadHasMessages(t);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectThread(t.id)}
                    className={`w-full text-left px-5 py-4 hover:bg-muted/10 transition-colors ${active ? "bg-primary/5 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`text-sm truncate ${hasUnread ? "font-bold" : "font-semibold"}`}>
                            {t.resellerCompanyName ?? `Reseller #${t.resellerId}`}
                          </div>
                          {hasUnread && (
                            <span className="shrink-0 inline-flex h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        {hasMsg ? (
                          <div className={`text-xs mt-0.5 truncate ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {t.lastMessageAuthor === "admin" ? "You: " : ""}{t.lastMessagePreview}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground/60 mt-0.5 italic">No messages yet</div>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground shrink-0">
                        {threadDate(t)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Message panel ── */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/10 shrink-0">
            <div className="text-sm font-bold">
              {selectedThread
                ? (selectedThread.resellerCompanyName ?? `Reseller #${selectedThread.resellerId}`)
                : "Select a conversation"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {selectedThread ? selectedThread.subject : "Choose a reseller from the list to view their chat"}
            </div>
          </div>

          <div className="flex-1 p-5 flex flex-col min-h-0">
            {!selectedThreadId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Select a conversation to view messages</p>
              </div>
            ) : messagesLoading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading messages…</div>
            ) : list.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Start the conversation below</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 mb-4">
                {list.map((m) => (
                  <div key={m.id} className={`flex ${m.authorRole === "admin" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 border ${
                        m.authorRole === "admin"
                          ? "bg-primary text-primary-foreground border-primary/20"
                          : "bg-muted/10 text-foreground border-border/60"
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1 flex items-center justify-between gap-3">
                        <span className="font-semibold">{m.authorRole === "admin" ? "You" : (selectedThread?.resellerCompanyName ?? "Reseller")}</span>
                        <span>{format(new Date(m.createdAt), "dd MMM, HH:mm")}</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{m.message}</div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}

            <div className={`${list.length > 0 ? "" : "mt-4"} pt-4 border-t border-border/60 flex gap-2`}>
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
                placeholder={selectedThreadId ? "Type a message to this reseller…" : "Select a conversation first"}
                disabled={!selectedThreadId}
              />
              <button
                type="button"
                onClick={send}
                disabled={!selectedThreadId || postMessage.isPending || !text.trim()}
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
