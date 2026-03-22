"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, Bot, User, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, Card, Button } from "@/components/common";
import { LoadingSpinner } from "@/components/loading";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO string for serialization
}

const STORAGE_KEY = "vestra_assistant_messages";

const EXAMPLE_QUESTIONS = [
  "전세 계약 시 주의할 점은 무엇인가요?",
  "1세대 1주택 양도세 비과세 요건을 알려주세요",
  "근저당 설정액이 시세의 70%를 넘으면 위험한가요?",
  "부동산 투자 시 레버리지 전략의 장단점은?",
  "2025년 부동산 시장 전망은 어떤가요?",
  "종합부동산세 계산 방법을 알려주세요",
];

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Message[];
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // storage full or unavailable
  }
}

function getContextPrefix(): string {
  if (typeof window === "undefined") return "";
  try {
    const lastAddress = localStorage.getItem("vestra_last_address");
    if (lastAddress) {
      return `[사용자 컨텍스트] 최근 분석한 주소: ${lastAddress}\n\n`;
    }
  } catch {
    // ignore
  }
  return "";
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore messages from localStorage on mount
  useEffect(() => {
    setMessages(loadMessages());
    setHydrated(true);
  }, []);

  // Persist messages whenever they change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveMessages(messages);
    }
  }, [messages, hydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const contextPrefix = getContextPrefix();
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Prepend context to the first user message if available
      if (contextPrefix && allMessages.length > 0) {
        const firstUserIdx = allMessages.findIndex((m) => m.role === "user");
        if (firstUserIdx >= 0) {
          allMessages[firstUserIdx] = {
            ...allMessages[firstUserIdx],
            content: contextPrefix + allMessages[firstUserIdx].content,
          };
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const assistantMessage: Message = {
        role: "assistant",
        content: data.content,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: "죄송합니다. 응답 생성 중 오류가 발생했습니다. API 키 설정을 확인해주세요.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] lg:h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <PageHeader icon={MessageSquare} title="AI 어시스턴트" description="부동산 전문 AI에게 무엇이든 물어보세요" />
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={clearConversation}
          >
            대화 초기화
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-label="채팅 메시지" aria-live="polite">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">VESTRA AI 어시스턴트</h3>
              <p className="text-secondary text-sm mb-6 max-w-md">
                부동산 권리분석, 세무, 투자, 계약, 전세 보호 등<br />
                부동산에 관한 모든 질문에 답변해드립니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                {EXAMPLE_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left px-3 py-2.5 bg-[#f5f5f7] border border-border rounded-lg text-xs text-secondary hover:bg-[#e5e5e7] hover:text-foreground transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot size={18} className="text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-[#f5f5f7] border border-border text-foreground"
                )}
              >
                <div className="whitespace-pre-wrap leading-relaxed prose">{msg.content}</div>
                <div className={cn("text-[10px] mt-2", msg.role === "user" ? "text-blue-200" : "text-muted")}>
                  {new Date(msg.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-[#e5e5e7] flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-secondary" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3" aria-busy="true">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot size={18} className="text-primary" />
              </div>
              <div className="bg-[#f5f5f7] border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <LoadingSpinner size="sm" variant="inline" />
                  답변을 생성하고 있습니다...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="부동산에 관해 무엇이든 물어보세요..."
              aria-label="메시지 입력"
              className="flex-1 px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
              disabled={loading}
            />
            <Button
              icon={Send}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              size="lg"
              aria-label="메시지 전송"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
