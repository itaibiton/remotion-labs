"use client";

import { useEffect, useRef } from "react";
import { User, Bot, Loader2 } from "lucide-react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isRefining?: boolean;
}

export function ChatMessages({ messages, isRefining }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isRefining]);

  if (messages.length === 0 && !isRefining) {
    return null;
  }

  return (
    <div className="max-h-[200px] overflow-y-auto space-y-3 p-3">
      {messages.map((message, index) => (
        <div key={index}>
          {message.role === "user" ? (
            <div className="flex justify-end">
              <div className="ml-auto max-w-[80%] bg-primary text-primary-foreground rounded-lg rounded-tr-none px-3 py-2 text-sm">
                <div className="flex items-center gap-1.5 mb-1 opacity-70">
                  <User className="h-3 w-3" />
                  <span className="text-xs font-medium">You</span>
                </div>
                <p>{message.content}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-start">
              <div className="mr-auto max-w-[80%] bg-muted rounded-lg rounded-tl-none px-3 py-2 text-sm">
                <div className="flex items-center gap-1.5 mb-1 opacity-70">
                  <Bot className="h-3 w-3" />
                  <span className="text-xs font-medium">Claude</span>
                </div>
                <p>{message.content}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {isRefining && (
        <div className="flex justify-start">
          <div className="mr-auto max-w-[80%] bg-muted rounded-lg rounded-tl-none px-3 py-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Claude is refining...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
