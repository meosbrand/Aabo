"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Send, User } from "lucide-react";
import { getSecurityAdvice } from "@/lib/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Interface representing a single message in the chat.
 */
interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
}

/**
 * Renders the Co-pilot chat page.
 * This component provides a chat interface for users to interact with the AI security assistant.
 * It handles message state, user input, and communication with the AI backend.
 * @returns {JSX.Element} The CopilotPage component.
 */
export default function CopilotPage() {
  // State for managing the list of chat messages.
  const [messages, setMessages] = useState<Message[]>([]);
  // State for the user's current input in the text field.
  const [input, setInput] = useState("");
  // State to indicate if the bot is currently generating a response.
  const [isLoading, setIsLoading] = useState(false);
  // Ref to the end of the messages list, for auto-scrolling.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Retrieves language context for translations.
  const { language, t } = useLanguage();
  // Gets the translated strings for the current language.
  const T = t.copilot[language];

  /**
   * Scrolls the chat view to the bottom.
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect to scroll to the bottom whenever messages change.
  useEffect(scrollToBottom, [messages]);

  /**
   * Handles the submission of the chat form.
   * @param {FormEvent} e - The form submission event.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Create a new message from the user's input.
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Call the server action to get advice from the AI.
    const response = await getSecurityAdvice({ query: input, language });

    // Create a new message from the bot's response.
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "bot",
      content: response.success ? response.advice : response.error || "An unexpected error occurred.",
    };
    setMessages((prev) => [...prev, botMessage]);
    setIsLoading(false);
  };

  return (
    <div className="h-full flex flex-col">
        {/* Page Header */}
        <div>
            <h1 className="text-3xl font-bold">{T.title}</h1>
            <p className="text-muted-foreground">{T.description}</p>
        </div>
      {/* Chat Interface Card */}
      <Card className="flex-grow mt-8 flex flex-col shadow-lg">
        <CardContent className="flex-grow p-4 md:p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Initial welcome message if no messages exist */}
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground p-8">
                <Bot className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-xl font-semibold">{T.initialPrompt}</h2>
                <p>{T.examplePrompt}</p>
              </div>
            )}
            {/* Render all messages */}
            {messages.map((message) => (
              <div key={message.id} className={`flex items-start gap-4 ${message.role === "user" ? "justify-end" : ""}`}>
                {message.role === "bot" && (
                  <Avatar className="w-8 h-8 border-2 border-primary">
                    <AvatarFallback><Bot className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-md p-3 rounded-xl ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                 {message.role === "user" && (
                  <Avatar className="w-8 h-8">
                     <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {/* Loading skeleton while bot is typing */}
            {isLoading && (
               <div className="flex items-start gap-4">
                  <Avatar className="w-8 h-8 border-2 border-primary">
                    <AvatarFallback><Bot className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                  <div className="max-w-md p-3 rounded-xl bg-secondary space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
              </div>
            )}
            {/* Empty div for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        {/* Chat input form */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={T.placeholder}
              autoComplete="off"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}