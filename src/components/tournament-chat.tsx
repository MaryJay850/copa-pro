"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ChatMsg {
  id: string;
  playerName: string;
  playerId: string;
  message: string;
  createdAt: string;
}

export function TournamentChat({
  tournamentId,
  currentPlayerId,
  canManage,
  onSend,
  onDelete,
  onLoadMessages,
}: {
  tournamentId: string;
  currentPlayerId: string | null;
  canManage: boolean;
  onSend: (message: string) => Promise<ChatMsg>;
  onDelete: (messageId: string) => Promise<void>;
  onLoadMessages: (limit?: number, before?: string) => Promise<ChatMsg[]>;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    onLoadMessages(50).then((msgs) => {
      setMessages(msgs.reverse()); // API returns newest first, we want oldest first
      setHasMore(msgs.length === 50);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 100);
    }).catch(() => {});
  }, []);

  // Poll for new messages every 5s
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const latest = await onLoadMessages(20);
        if (latest.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = latest.filter(m => !existingIds.has(m.id)).reverse();
            if (newMsgs.length > 0) {
              const shouldAutoScroll = containerRef.current &&
                containerRef.current.scrollHeight - containerRef.current.scrollTop - containerRef.current.clientHeight < 100;
              const updated = [...prev, ...newMsgs];
              if (shouldAutoScroll) {
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
              }
              return updated;
            }
            return prev;
          });
        }
      } catch {}
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const msg = await onSend(input.trim());
      setMessages(prev => [...prev, msg]);
      setInput("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {}
    setSending(false);
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const older = await onLoadMessages(50, messages[0].id);
      if (older.length < 50) setHasMore(false);
      setMessages(prev => [...older.reverse(), ...prev]);
    } catch {}
    setLoadingMore(false);
  };

  const handleDelete = async (msgId: string) => {
    await onDelete(msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className="flex flex-col h-[500px]">
      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {hasMore && messages.length > 0 && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-xs text-primary hover:underline w-full text-center py-1"
          >
            {loadingMore ? "A carregar..." : "Carregar mais antigas"}
          </button>
        )}

        {messages.length === 0 && (
          <div className="text-center text-text-muted text-sm py-10">
            Ainda nao ha mensagens. Se o primeiro a escrever!
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.playerId === currentPlayerId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
              <div className={`max-w-[75%] rounded-xl px-3 py-2 ${
                isMe ? "bg-primary text-white" : "bg-surface-alt border border-border"
              }`}>
                {!isMe && (
                  <div className="text-[10px] font-bold text-primary mb-0.5">{msg.playerName}</div>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                <div className={`text-[10px] mt-0.5 ${isMe ? "text-white/60" : "text-text-muted"} flex items-center gap-1`}>
                  <span>{formatTime(msg.createdAt)}</span>
                  {(isMe || canManage) && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity ml-1 ${isMe ? "text-white/40 hover:text-white/80" : "text-text-muted hover:text-red-500"}`}
                    >
                      x
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {currentPlayerId ? (
        <div className="border-t border-border px-3 py-2.5 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Escreve uma mensagem..."
            maxLength={500}
            className="flex-1 text-sm rounded-lg border border-border bg-surface px-3 py-2 placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button onClick={handleSend} disabled={sending || !input.trim()} size="sm">
            {sending ? "..." : "Enviar"}
          </Button>
        </div>
      ) : (
        <div className="border-t border-border px-3 py-2.5 text-center text-xs text-text-muted">
          Faz login para participar no chat
        </div>
      )}
    </Card>
  );
}
