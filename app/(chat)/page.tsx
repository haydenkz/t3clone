"use client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Send, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
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

export default function Home() {
    const [textareaHeight, setTextareaHeight] = useState(75);
    const [message, setMessage] = useState("");
    const [model, setModel] = useState("deepseek-v3");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();
    const { isCollapsed } = useSidebar();

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            const scrollHeight = textareaRef.current.scrollHeight;
            const newHeight = Math.max(75, Math.min(scrollHeight, 200));
            textareaRef.current.style.height = `${newHeight}px`;
            setTextareaHeight(newHeight);
        }
    };

    const createNewChatSession = () => {
        if (!message.trim()) return;

        const chatId = uuidv4();
        const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");

        const newChatSession: ChatSession = {
            id: chatId,
            title,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        try {
            // Save to localStorage
            const savedChats = localStorage.getItem("chatSessions");
            const chatSessions: ChatSession[] = savedChats
                ? JSON.parse(savedChats)
                : [];
            chatSessions.unshift(newChatSession); // Add to beginning
            localStorage.setItem("chatSessions", JSON.stringify(chatSessions));

            // Dispatch custom event to notify sidebar of changes
            window.dispatchEvent(new CustomEvent("chatSessionsUpdated"));

            // Store the message to send in session storage
            sessionStorage.setItem("pendingMessage", message);

            // Navigate to the new chat
            router.push(`/chat/${chatId}`);
        } catch (error) {
            console.error("Error creating chat session:", error);
        }
    };

    const handleSendMessage = () => {
        createNewChatSession();
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

    return (
        <section className="flex flex-col h-full w-full rounded-tl-xl border-t-[1px] border-l-[1px] border-[#2e1f27] bg-[#211c26] relative">
            {/* Welcome message */}
            <div className="flex-1 flex items-center justify-center">
                <h1 className="text-[#d5aec4] text-2xl font-light">
                    Welcome to T3.chat
                </h1>
            </div>

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
                                placeholder="Type your message to start a new chat..."
                                onInput={adjustHeight}
                                onKeyDown={handleKeyPress}
                                style={{ height: `${textareaHeight}px` }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!message.trim()}
                                className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4 text-purple-300" />
                            </button>
                        </div>

                        {/* Bottom row with model selector */}
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
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
