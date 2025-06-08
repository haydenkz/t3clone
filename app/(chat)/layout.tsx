"use client";

import { SidebarProvider } from "@/components/sidebar-context";
import { SidebarContent } from "@/components/sidebar-content";
import { useSidebar } from "@/components/sidebar-context";

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();

    return (
        <main className={`flex min-h-screen bg-[#1c131a] flex-row`}>
            <SidebarContent />

            <section className="flex flex-col w-full h-screen overflow-hidden">
                <div
                    className={`bg-[#1c131a] ${
                        isCollapsed ? "h-[0px]" : "h-[15px]"
                    } transition-all duration-100 flex-shrink-0`}
                />
                <div className="flex-1 overflow-hidden">
                    <div className="h-full">{children}</div>
                </div>
            </section>
        </main>
    );
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <SidebarProvider>
            <LayoutContent>{children}</LayoutContent>
        </SidebarProvider>
    );
}
