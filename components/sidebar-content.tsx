"use client";

import T3svg from "@/components/t3svg";
import { Sidebar, MessageSquare, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "@/components/sidebar-context";

interface ChatSession {
    id: string;
    title: string;
    messages: unknown[];
    createdAt: Date;
    updatedAt: Date;
}

export function SidebarContent() {
    const { isCollapsed, setIsCollapsed } = useSidebar();
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const router = useRouter();
    const pathname = usePathname();

    // Load chat sessions from localStorage
    useEffect(() => {
        const loadChatSessions = () => {
            try {
                const savedChats = localStorage.getItem("chatSessions");
                if (savedChats) {
                    const sessions: ChatSession[] = JSON.parse(savedChats);
                    setChatSessions(
                        sessions.sort(
                            (a, b) =>
                                new Date(b.updatedAt).getTime() -
                                new Date(a.updatedAt).getTime()
                        )
                    );
                }
            } catch (error) {
                console.error("Error loading chat sessions:", error);
            }
        };

        // Load initially
        loadChatSessions();

        // Listen for localStorage changes (from other tabs or when chat sessions are updated)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "chatSessions") {
                loadChatSessions();
            }
        };

        window.addEventListener("storage", handleStorageChange);

        // Also listen for custom storage events from the same tab
        const handleCustomStorageEvent = () => {
            loadChatSessions();
        };

        window.addEventListener(
            "chatSessionsUpdated",
            handleCustomStorageEvent
        );

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener(
                "chatSessionsUpdated",
                handleCustomStorageEvent
            );
        };
    }, []); // Remove pathname dependency

    const createNewChat = () => {
        router.push("/");
    };

    const navigateToChat = (chatId: string) => {
        router.push(`/chat/${chatId}`);
    };

    const formatDate = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return "Today";
        } else if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return new Date(date).toLocaleDateString();
        }
    };

    return (
        <>
            {/* Fixed button container that stays visible */}
            <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    aria-label={
                        isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                    }
                    className="text-[#d5aec4] hover:text-white transition-colors p-2 rounded-md hover:bg-white/10"
                >
                    <Sidebar className="w-[16px]" />
                </button>
            </div>

            <section
                className={`${
                    isCollapsed ? "w-0" : "w-[300px]"
                }  bg-gradient-to-b from-[#1c131a] via-[#140e13] bg-[length:2000%] to-[#0e090d] transition-all pt-5 duration-100 flex flex-col overflow-hidden`}
            >
                <div className="pt-2.5 px-4">
                    {/* Add top padding to account for fixed button */}
                    <div
                        className={`h-3.5 mb-6 text-[#d5aec4] flex justify-center transition-opacity duration-100 ${
                            isCollapsed ? "opacity-0" : "opacity-100"
                        }`}
                    >
                        <T3svg />
                    </div>
                </div>

                {!isCollapsed && (
                    <>
                        <div className="px-4 mb-4">
                            <button
                                onClick={createNewChat}
                                className="p-2.5 font-bold w-full bg-[#3a1126] text-[#d5aec4] text-xs border-1 rounded-md hover:bg-[#4a1533] transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-3 h-3" />
                                New Chat
                            </button>
                        </div>

                        {/* Chat sessions list */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4">
                            <div className="space-y-2">
                                {chatSessions.map((session) => (
                                    <button
                                        key={session.id}
                                        onClick={() =>
                                            navigateToChat(session.id)
                                        }
                                        className={`w-full p-3 rounded-lg text-left transition-colors border ${
                                            pathname === `/chat/${session.id}`
                                                ? "bg-[#3a1126] border-[#5a1836] text-[#d5aec4]"
                                                : "bg-[#2a1520] border-[#3a1526] text-[#b59aa8] hover:bg-[#3a1126] hover:border-[#4a1530]"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">
                                                    {session.title}
                                                </div>
                                                <div className="text-xs opacity-60 mt-1">
                                                    {formatDate(
                                                        session.updatedAt
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}

                                {chatSessions.length === 0 && (
                                    <div className="text-[#d5aec4]/50 text-sm text-center py-8">
                                        No chats yet. Start a conversation!
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </section>
        </>
    );
}
