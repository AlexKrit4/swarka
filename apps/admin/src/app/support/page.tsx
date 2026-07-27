"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAdminUser } from "@/components/AdminUserContext";
import {
  getMySupportThread,
  getSupportThreads,
  markSupportThreadRead,
  openSupportThread,
  sendSupportMessage,
  uploadSupportFile,
  type SupportMessage,
  type SupportThreadSummary,
} from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function attachmentHref(url: string) {
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

function isImageMime(mime: string | null, name: string | null) {
  if (mime?.startsWith("image/")) return true;
  return !!name && /\.(jpe?g|png|gif|webp)$/i.test(name);
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({
  message,
  mine,
  supportLabel,
}: {
  message: SupportMessage;
  mine: boolean;
  supportLabel: string;
}) {
  const fromSupport = message.senderRole === "SUPER_ADMIN";
  const author = mine
    ? "Вы"
    : fromSupport
      ? supportLabel
      : message.senderName || message.senderEmail;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
          mine ? "bg-[#F7E018] text-black" : "bg-gray-100 text-gray-900"
        }`}
      >
        <p className="text-[11px] opacity-70 mb-1">{author}</p>
        {message.body && <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>}
        {message.attachmentUrl && (
          <div className="mt-2">
            {isImageMime(message.attachmentMime, message.attachmentName) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <a href={attachmentHref(message.attachmentUrl)} target="_blank" rel="noreferrer">
                <img
                  src={attachmentHref(message.attachmentUrl)}
                  alt={message.attachmentName || "Вложение"}
                  className="max-h-48 rounded-lg"
                />
              </a>
            ) : (
              <a
                href={attachmentHref(message.attachmentUrl)}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline break-all"
              >
                {message.attachmentName || "Скачать файл"}
              </a>
            )}
          </div>
        )}
        <p className="text-[10px] opacity-60 mt-1 text-right">{formatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}

function ChatPanel({
  title,
  subtitle,
  messages,
  currentUserId,
  supportLabel,
  onSend,
  sending,
}: {
  title: string;
  subtitle?: string;
  messages: SupportMessage[];
  currentUserId: string;
  supportLabel: string;
  onSend: (payload: {
    body: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentMime?: string;
  }) => Promise<void>;
  sending: boolean;
}) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = async () => {
    const body = text.trim();
    if (!body && !pendingFile) return;
    setError(null);
    setUploading(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;
      let attachmentMime: string | undefined;
      if (pendingFile) {
        const uploaded = await uploadSupportFile(pendingFile);
        attachmentUrl = uploaded.url;
        attachmentName = uploaded.name;
        attachmentMime = uploaded.mime;
      }
      await onSend({ body, attachmentUrl, attachmentName, attachmentMime });
      setText("");
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card flex flex-col h-[70vh] min-h-[420px] p-0 overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3 shrink-0">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center mt-8">Сообщений пока нет — напишите первым</p>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              mine={message.senderUserId === currentUserId}
              supportLabel={supportLabel}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 px-4 py-3 shrink-0 space-y-2">
        {pendingFile && (
          <div className="flex items-center justify-between gap-2 text-sm text-gray-600">
            <span className="truncate">Файл: {pendingFile.name}</span>
            <button
              type="button"
              className="text-red-600 underline shrink-0"
              onClick={() => {
                setPendingFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Убрать
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Напишите сообщение..."
            className="flex-1 min-w-[180px] rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
          <label className="rounded-lg border border-gray-200 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
            Файл
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={sending || uploading || (!text.trim() && !pendingFile)}
            onClick={() => void handleSubmit()}
          >
            {uploading || sending ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSupportView({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getMySupportThread();
    setThreadId(data.thread.id);
    setMessages(data.messages);
    await markSupportThreadRead(data.thread.id).catch(() => {});
  }, []);

  useEffect(() => {
    reload()
      .catch(console.error)
      .finally(() => setLoading(false));
    const timer = setInterval(() => {
      reload().catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [reload]);

  if (loading) return <p className="text-gray-500">Загрузка чата...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Поддержка</h1>
        <p className="text-sm text-gray-600 mt-1">
          Чат с поддержкой сервиса по серверу. Можно писать текст и прикреплять файлы.
        </p>
      </div>
      <ChatPanel
        title="Поддержка сервиса"
        subtitle="Вопросы по работе мини-сервера и оплате"
        messages={messages}
        currentUserId={userId}
        supportLabel="Поддержка"
        sending={sending}
        onSend={async (payload) => {
          setSending(true);
          try {
            await sendSupportMessage({
              body: payload.body,
              threadId: threadId ?? undefined,
              attachmentUrl: payload.attachmentUrl,
              attachmentName: payload.attachmentName,
              attachmentMime: payload.attachmentMime,
            });
            await reload();
          } finally {
            setSending(false);
          }
        }}
      />
    </div>
  );
}

function SuperSupportView({ userId }: { userId: string }) {
  const [threads, setThreads] = useState<SupportThreadSummary[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [adminLabel, setAdminLabel] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  const reloadList = useCallback(async () => {
    const data = await getSupportThreads();
    setThreads(data.threads);
  }, []);

  const loadThread = useCallback(async (adminUserId: string) => {
    const data = await openSupportThread(adminUserId);
    setSelectedAdminId(adminUserId);
    setThreadId(data.thread.id);
    setMessages(data.messages);
    setAdminLabel(data.thread.adminName || data.thread.adminEmail);
    await markSupportThreadRead(data.thread.id).catch(() => {});
  }, []);

  useEffect(() => {
    reloadList()
      .catch(console.error)
      .finally(() => setLoadingList(false));
    const timer = setInterval(() => {
      reloadList().catch(() => {});
      if (selectedAdminId) {
        loadThread(selectedAdminId).catch(() => {});
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [reloadList, loadThread, selectedAdminId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Поддержка</h1>
        <p className="text-sm text-gray-600 mt-1">
          Индивидуальные чаты с подадминами. Для них вы отображаетесь как поддержка сервиса.
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <div className="card p-0 overflow-hidden max-h-[70vh] flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold shrink-0">Админы</div>
          <div className="overflow-y-auto flex-1">
            {loadingList ? (
              <p className="p-4 text-sm text-gray-500">Загрузка...</p>
            ) : threads.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Подадминов пока нет</p>
            ) : (
              threads.map((item) => {
                const active = selectedAdminId === item.adminUserId;
                const preview =
                  item.lastMessage?.body ||
                  (item.lastMessage?.attachmentName ? `📎 ${item.lastMessage.attachmentName}` : "Нет сообщений");
                return (
                  <button
                    key={item.adminUserId}
                    type="button"
                    onClick={() => void loadThread(item.adminUserId)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${
                      active ? "bg-[#F7E018]/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">
                        {item.adminName || item.adminEmail}
                      </p>
                      {item.unreadCount > 0 && (
                        <span className="shrink-0 rounded-full bg-red-500 text-white text-[11px] px-2 py-0.5">
                          {item.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{preview}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {selectedAdminId && threadId ? (
          <ChatPanel
            title={adminLabel}
            subtitle="Диалог поддержки"
            messages={messages}
            currentUserId={userId}
            supportLabel="Вы (поддержка)"
            sending={sending}
            onSend={async (payload) => {
              setSending(true);
              try {
                await sendSupportMessage({
                  body: payload.body,
                  threadId,
                  adminUserId: selectedAdminId,
                  attachmentUrl: payload.attachmentUrl,
                  attachmentName: payload.attachmentName,
                  attachmentMime: payload.attachmentMime,
                });
                await loadThread(selectedAdminId);
                await reloadList();
              } finally {
                setSending(false);
              }
            }}
          />
        ) : (
          <div className="card flex items-center justify-center min-h-[320px] text-sm text-gray-500">
            Выберите админа слева, чтобы открыть чат
          </div>
        )}
      </div>
    </div>
  );
}

function SupportContent() {
  const user = useAdminUser();

  if (!user) return <p className="text-gray-500">Загрузка...</p>;

  if (user.role === "VIEWER") {
    return (
      <div className="card">
        <h1 className="text-xl font-bold mb-2">Нет доступа</h1>
        <p className="text-sm text-gray-600">У наблюдателя нет доступа к поддержке.</p>
      </div>
    );
  }

  if (user.role === "SUPER_ADMIN") {
    return <SuperSupportView userId={user.id} />;
  }

  if (user.role === "ADMIN") {
    return <AdminSupportView userId={user.id} />;
  }

  return null;
}

export default function SupportPage() {
  return (
    <AuthGuard>
      <SupportContent />
    </AuthGuard>
  );
}
