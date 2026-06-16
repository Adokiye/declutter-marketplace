"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Headphones, Loader2, MessageCircle, Send, Store, User as UserIcon, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/utils";
import type { ChatMessage, ChatThread, ChatThreadType, Order } from "@/lib/types";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000/orders";

type TabKey = "support" | "direct";

export function OrderChat({ order }: { order: Order }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [tab, setTab] = useState<TabKey>("support");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement | null>(null);

  const isBuyer = user?.id === order.buyerUserId;
  const isSeller = user?.id === order.sellerUserId;
  const isStaff = user?.role === "admin";
  const contactRevealed = !!order.sellerContactRevealedAt;

  const senderRole: ChatMessage["senderRole"] = isStaff ? "admin" : isSeller ? "seller" : "buyer";

  // The "support" thread depends on which side is viewing; "direct" is buyer↔seller.
  const supportType: ChatThreadType = isSeller && !isBuyer ? "declutter_seller" : "declutter_buyer";
  const directLabel = isSeller && !isBuyer ? "Buyer" : "Seller";

  const tabs = useMemo(() => {
    const list: { key: TabKey; label: string; icon: typeof Headphones }[] = [
      { key: "support", label: "Declutter support", icon: Headphones }
    ];
    if (contactRevealed) list.push({ key: "direct", label: directLabel, icon: directLabel === "Seller" ? Store : UserIcon });
    return list;
  }, [contactRevealed, directLabel]);

  const activeThread = useMemo(() => {
    const wantType: ChatThreadType = tab === "direct" ? "buyer_seller" : supportType;
    return threads.find((t) => t.type === wantType) ?? null;
  }, [threads, tab, supportType]);

  // Load threads once the panel is opened.
  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    api.chat
      .threads(order.id)
      .then((list) => active && setThreads(list))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, user, order.id]);

  // Connect the realtime socket while the panel is open.
  useEffect(() => {
    if (!open || !user) return;
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("message:new", (msg: ChatMessage) => {
      if (seen.current.has(msg.id)) return;
      seen.current.add(msg.id);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [open, user]);

  // Load messages + join the room whenever the active thread changes.
  useEffect(() => {
    if (!open || !user || !activeThread) return;
    let active = true;
    setLoading(true);
    seen.current = new Set();
    api.chat
      .messages(activeThread.id, { limit: 100 })
      .then((res) => {
        if (!active) return;
        res.results.forEach((m) => seen.current.add(m.id));
        setMessages(res.results);
      })
      .catch(() => active && setMessages([]))
      .finally(() => active && setLoading(false));

    api.chat.markRead(activeThread.id, user.id).catch(() => {});
    socketRef.current?.emit("thread:join", { threadId: activeThread.id, userId: user.id, role: senderRole });

    return () => {
      active = false;
    };
  }, [open, user, activeThread, senderRole]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = body.trim();
    if (!text || !activeThread || !user) return;
    setSending(true);
    setBody("");
    const socket = socketRef.current;
    try {
      if (socket?.connected) {
        socket.emit("message:send", { threadId: activeThread.id, senderUserId: user.id, senderRole, body: text });
      } else {
        const msg = await api.chat.send(activeThread.id, { senderUserId: user.id, senderRole, body: text });
        seen.current.add(msg.id);
        setMessages((prev) => [...prev, msg]);
      }
    } catch {
      setBody(text); // restore on failure
    } finally {
      setSending(false);
    }
  }, [body, activeThread, user, senderRole]);

  if (!user || (!isBuyer && !isSeller && !isStaff)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pb-4">
      {open ? (
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-950 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Order #{order.id.slice(0, 8)}</p>
              <p className="text-[11px] text-zinc-400">Messages are tied to this order</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-1 border-b border-zinc-100 p-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    tab === t.key ? "bg-brand text-brand-foreground" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          <div ref={listRef} className="h-72 space-y-3 overflow-y-auto bg-zinc-50 p-4">
            {loading ? (
              <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
            ) : messages.length === 0 ? (
              <p className="grid h-full place-items-center text-center text-xs text-zinc-400">
                No messages yet. Say hello to {tab === "direct" ? directLabel.toLowerCase() : "Declutter support"}.
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.senderUserId === user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-brand text-brand-foreground" : "bg-white text-zinc-900 ring-1 ring-zinc-200"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${mine ? "text-brand-foreground/70" : "text-zinc-400"}`}>{formatDateTime(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-center gap-2 border-t border-zinc-100 p-3"
          >
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message…"
              aria-label="Message"
              data-testid="order-chat-input"
              className="h-11 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none focus:border-brand focus:bg-white"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              aria-label="Send message"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          data-testid="order-chat-open"
          className="ml-auto flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-xl"
        >
          <MessageCircle className="h-4 w-4" /> Chat · order #{order.id.slice(0, 8)}
        </button>
      )}
    </div>
  );
}
