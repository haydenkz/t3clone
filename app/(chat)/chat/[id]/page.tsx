"use client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ChevronDown, Send, User, Bot } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSidebar } from "@/components/sidebar-context";

interface Message {
    id: string;
    type: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}

const UserMessage = ({ message }: { message: Message }) => {
    return (
        <div className="flex justify-end mb-4">
            <div className="flex max-w-[70%] min-w-0 flex-row-reverse items-start gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/20 border border-purple-500/30">
                    <User className="w-4 h-4 text-purple-300" />
                </div>

                {/* Message bubble */}
                <div className="rounded-2xl px-4 py-3 backdrop-blur-sm border shadow-lg bg-purple-500/10 border-purple-500/20 min-w-0 overflow-hidden">
                    <div className="text-sm font-light leading-relaxed whitespace-pre-wrap break-words word-break overflow-wrap-anywhere text-[#d5aec4]">
                        {message.content}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AssistantMessage = ({
    message,
    isStreaming = false,
}: {
    message: Message;
    isStreaming?: boolean;
}) => {
    return (
        <div className="mb-6">
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-pink-500/20 border border-pink-500/30">
                    <Bot className="w-4 h-4 text-pink-300" />
                </div>

                {/* Message content inline with avatar */}
                <div className="text-sm font-light leading-relaxed text-[#d5aec4] flex-1">
                    {message.content ? (
                        <MarkdownRenderer content={message.content} />
                    ) : isStreaming ? (
                        <div className="text-[#d5aec4]/50">Thinking...</div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default function ChatPage() {
    const params = useParams();
    const chatId = params.id as string;
    const { isCollapsed } = useSidebar();

    const [model, setModel] = useState("deepseek-v3");
    const [textareaHeight, setTextareaHeight] = useState(75);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
        null
    );
    const [chatSession, setChatSession] = useState<ChatSession | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const sendMessageToAPI = useCallback(
        async (
            messageContent: string,
            messageHistory: Message[],
            assistantMessageId: string
        ) => {
            try {
                const response = await fetch(`/api/${model}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messageHistory,
                        prompt: messageContent,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch response");
                }

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                let accumulatedContent = "";

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;

                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const data = line.slice(6).trim();
                                if (data === "[DONE]") {
                                    break;
                                }
                                try {
                                    const parsed = JSON.parse(data);
                                    if (parsed.content) {
                                        accumulatedContent += parsed.content;

                                        // Update message with accumulated content
                                        setMessages((prev) =>
                                            prev.map((msg) =>
                                                msg.id === assistantMessageId
                                                    ? {
                                                          ...msg,
                                                          content:
                                                              accumulatedContent,
                                                      }
                                                    : msg
                                            )
                                        );
                                    }
                                } catch {
                                    // Ignore parsing errors for incomplete chunks
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error getting response:", error);
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantMessageId
                            ? {
                                  ...msg,
                                  content:
                                      "Sorry, I encountered an error. Please try again.",
                              }
                            : msg
                    )
                );
            } finally {
                setIsLoading(false);
                setStreamingMessageId(null);
            }
        },
        [model]
    );

    // Load chat session from localStorage on mount
    useEffect(() => {
        const loadChatSession = () => {
            try {
                const savedChats = localStorage.getItem("chatSessions");
                if (savedChats) {
                    const chatSessions: ChatSession[] = JSON.parse(savedChats);
                    const currentChat = chatSessions.find(
                        (chat) => chat.id === chatId
                    );
                    if (currentChat) {
                        setChatSession(currentChat);
                        setMessages(
                            currentChat.messages.map((msg) => ({
                                ...msg,
                                timestamp: new Date(msg.timestamp),
                            }))
                        );
                    } else {
                        // If no chat session exists, create one
                        const newSession: ChatSession = {
                            id: chatId,
                            title: "New Chat",
                            messages: [],
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        };
                        setChatSession(newSession);
                    }
                }
            } catch (error) {
                console.error("Error loading chat session:", error);
            }
        };

        loadChatSession();
    }, [chatId]);

    // Handle pending message from session storage
    useEffect(() => {
        const pendingMessage = sessionStorage.getItem("pendingMessage");
        if (pendingMessage && chatSession) {
            sessionStorage.removeItem("pendingMessage");
            setMessage(pendingMessage);

            // Auto-send the message after a short delay
            setTimeout(() => {
                if (pendingMessage.trim()) {
                    const messageToSend = pendingMessage.trim();
                    setMessage("");

                    const userMessage: Message = {
                        id: Date.now().toString(),
                        type: "user",
                        content: messageToSend,
                        timestamp: new Date(),
                    };

                    setMessages([userMessage]);
                    setIsLoading(true);

                    // Create assistant message with empty content for streaming
                    const assistantMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        type: "assistant",
                        content: "",
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                    setStreamingMessageId(assistantMessage.id);

                    // Send API request
                    sendMessageToAPI(
                        messageToSend,
                        [userMessage],
                        assistantMessage.id
                    );
                }
            }, 100);
        }
    }, [chatSession, sendMessageToAPI]);

    // Save chat session to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            try {
                const savedChats = localStorage.getItem("chatSessions");
                const chatSessions: ChatSession[] = savedChats
                    ? JSON.parse(savedChats)
                    : [];
                const existingSessionIndex = chatSessions.findIndex(
                    (chat) => chat.id === chatId
                );

                if (existingSessionIndex >= 0) {
                    // Update existing session
                    const existingSession = chatSessions[existingSessionIndex];

                    // Update title from first user message if it's still "New Chat"
                    let updatedTitle = existingSession.title;
                    if (existingSession.title === "New Chat") {
                        const firstUserMessage = messages.find(
                            (m) => m.type === "user"
                        );
                        if (firstUserMessage) {
                            updatedTitle =
                                firstUserMessage.content.slice(0, 50) +
                                (firstUserMessage.content.length > 50
                                    ? "..."
                                    : "");
                        }
                    }

                    const updatedSession: ChatSession = {
                        ...existingSession,
                        title: updatedTitle,
                        messages,
                        updatedAt: new Date(),
                    };

                    chatSessions[existingSessionIndex] = updatedSession;

                    // Update local state only if title changed
                    if (updatedTitle !== existingSession.title) {
                        setChatSession(updatedSession);
                    }
                } else {
                    // Create new session if it doesn't exist
                    const firstUserMessage = messages.find(
                        (m) => m.type === "user"
                    );
                    const title = firstUserMessage
                        ? firstUserMessage.content.slice(0, 50) +
                          (firstUserMessage.content.length > 50 ? "..." : "")
                        : "New Chat";

                    const newSession: ChatSession = {
                        id: chatId,
                        title,
                        messages,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };

                    chatSessions.push(newSession);
                    setChatSession(newSession);
                }

                localStorage.setItem(
                    "chatSessions",
                    JSON.stringify(chatSessions)
                );
            } catch (error) {
                console.error("Error saving chat session:", error);
            }
        }
    }, [messages, chatId]);

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            const scrollHeight = textareaRef.current.scrollHeight;
            const newHeight = Math.max(75, Math.min(scrollHeight, 200));
            textareaRef.current.style.height = `${newHeight}px`;
            setTextareaHeight(newHeight);
        }
    };

    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current && chatContainerRef.current) {
            const container = chatContainerRef.current;
            const target = messagesEndRef.current;
            const currentInputBoxHeight = textareaHeight + 60;

            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();

            const inputBoxBuffer = currentInputBoxHeight + 40;
            const targetBottom = targetRect.bottom - containerRect.top;
            const containerVisibleHeight =
                container.clientHeight - inputBoxBuffer;

            if (targetBottom > containerVisibleHeight) {
                const scrollAmount = targetBottom - containerVisibleHeight;
                container.scrollTo({
                    top: container.scrollTop + scrollAmount,
                    behavior: "smooth",
                });
            }
        }
    }, [textareaHeight]);

    const scrollToBottomInstant = useCallback(() => {
        if (messagesEndRef.current && chatContainerRef.current) {
            const container = chatContainerRef.current;
            const target = messagesEndRef.current;
            const currentInputBoxHeight = textareaHeight + 60;

            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();

            const inputBoxBuffer = currentInputBoxHeight + 40;
            const targetBottom = targetRect.bottom - containerRect.top;
            const containerVisibleHeight =
                container.clientHeight - inputBoxBuffer;

            if (targetBottom > containerVisibleHeight) {
                const scrollAmount = targetBottom - containerVisibleHeight;
                container.scrollTo({
                    top: container.scrollTop + scrollAmount,
                    behavior: "instant",
                });
            }
        }
    }, [textareaHeight]);

    const handleSendMessage = async () => {
        if (!message.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: "user",
            content: message.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const messageContent = message.trim();
        setMessage("");
        setIsLoading(true);

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "75px";
            setTextareaHeight(75);
        }

        // Create assistant message with empty content for streaming
        const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: "assistant",
            content: "",
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessageId(assistantMessage.id);

        // Send API request
        await sendMessageToAPI(
            messageContent,
            [...messages, userMessage],
            assistantMessage.id
        );
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleModelSelect = (selectedModel: string) => {
        setModel(selectedModel);
    };

    useEffect(() => {
        adjustHeight();
    }, [message]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Smooth auto-scroll during streaming with throttling
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (isLoading && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.type === "assistant" && lastMessage.content) {
                timeoutId = setTimeout(() => {
                    scrollToBottomInstant();
                }, 50);
            }
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [messages, isLoading, scrollToBottomInstant]);

    const hasMessages = messages.length > 0;
    const inputBoxHeight = textareaHeight + 60;

    return (
        <section className="flex flex-col h-full w-full rounded-tl-xl border-t-[1px] border-l-[1px] border-[#2e1f27] bg-[#211c26] relative">
            {/* Chat messages container */}
            {hasMessages && (
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto px-6 py-6"
                    style={{ paddingBottom: `${inputBoxHeight + 40}px` }}
                >
                    <div className="max-w-4xl mx-auto">
                        {messages.map((msg) =>
                            msg.type === "user" ? (
                                <UserMessage key={msg.id} message={msg} />
                            ) : (
                                <AssistantMessage
                                    key={msg.id}
                                    message={msg}
                                    isStreaming={streamingMessageId === msg.id}
                                />
                            )
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}

            {/* Welcome message - only show when no messages */}
            {!hasMessages && (
                <div className="flex-1 flex items-center justify-center">
                    <h1 className="text-[#d5aec4] text-2xl font-light">
                        Welcome to T3.chat
                    </h1>
                </div>
            )}

            {/* Chat input - fixed at bottom with proper spacing */}
            <div
                className={`fixed bottom-4 ${
                    !isCollapsed ? "left-[265px]" : "left-2"
                } right-2 z-40 transition-all duration-100`}
            >
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl">
                        {/* Textarea and send button */}
                        <div className="flex items-end gap-3 mb-3">
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none resize-none text-[#d5aec4] placeholder-[#d5aec4]/50 font-light"
                                placeholder="Type your message..."
                                onInput={adjustHeight}
                                onKeyDown={handleKeyPress}
                                style={{ height: `${textareaHeight}px` }}
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!message.trim() || isLoading}
                                className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4 text-purple-300" />
                            </button>
                        </div>

                        {/* Bottom row with model selector and message count */}
                        <div className="flex justify-between items-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition-colors text-[#d5aec4] text-sm font-medium focus:outline-none">
                                    {model}
                                    <ChevronDown className="w-3 h-3 opacity-70" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl">
                                    <DropdownMenuItem
                                        className="text-[#d5aec4] hover:bg-white/10 focus:bg-white/10"
                                        onClick={() =>
                                            handleModelSelect("deepseek-v3")
                                        }
                                    >
                                        Deepseek-v3
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {messages.length > 0 && (
                                <div className="text-xs text-[#d5aec4]/50 font-light">
                                    {messages.length} message
                                    {messages.length !== 1 ? "s" : ""}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
