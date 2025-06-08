"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check } from "lucide-react";
import { useState, useRef } from "react";
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
    content: string;
}

const CodeBlock = ({
    className,
    children,
    ...props
}: {
    className?: string;
    children: React.ReactNode;
}) => {
    const [copied, setCopied] = useState(false);
    const codeRef = useRef<HTMLElement>(null);

    const copyToClipboard = async () => {
        if (codeRef.current) {
            const codeText = codeRef.current.textContent || "";
            try {
                await navigator.clipboard.writeText(codeText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error("Failed to copy text: ", err);
            }
        }
    };

    return (
        <div className="relative group">
            <pre className="bg-black/30 rounded-lg p-4 overflow-x-auto my-4 border border-white/10">
                <code ref={codeRef} className={className} {...props}>
                    {children}
                </code>
            </pre>
            <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 p-2 rounded-md bg-black/40 border border-white/20 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5"
                title={copied ? "Copied!" : "Copy code"}
            >
                {copied ? (
                    <>
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">Copied</span>
                    </>
                ) : (
                    <>
                        <Copy className="w-4 h-4 text-[#d5aec4]" />
                        <span className="text-xs text-[#d5aec4]">Copy</span>
                    </>
                )}
            </button>
        </div>
    );
};

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
                // Custom styling for code blocks with copy button
                code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const isInline = !match;
                    return isInline ? (
                        <code
                            className="bg-black/20 px-1.5 py-0.5 rounded text-sm border border-white/10"
                            {...props}
                        >
                            {children}
                        </code>
                    ) : (
                        <CodeBlock className={className} {...props}>
                            {children}
                        </CodeBlock>
                    );
                },
                // Custom styling for blockquotes
                blockquote({ children }) {
                    return (
                        <blockquote className="border-l-4 border-purple-500/50 pl-4 my-4 italic text-[#d5aec4]/80">
                            {children}
                        </blockquote>
                    );
                },
                // Custom styling for headings
                h1({ children }) {
                    return (
                        <h1 className="text-2xl font-semibold mb-4 text-[#d5aec4]">
                            {children}
                        </h1>
                    );
                },
                h2({ children }) {
                    return (
                        <h2 className="text-xl font-semibold mb-3 text-[#d5aec4]">
                            {children}
                        </h2>
                    );
                },
                h3({ children }) {
                    return (
                        <h3 className="text-lg font-semibold mb-2 text-[#d5aec4]">
                            {children}
                        </h3>
                    );
                },
                // Custom styling for lists
                ul({ children }) {
                    return (
                        <ul className="list-disc list-inside my-2 space-y-1">
                            {children}
                        </ul>
                    );
                },
                ol({ children }) {
                    return (
                        <ol className="list-decimal list-inside my-2 space-y-1">
                            {children}
                        </ol>
                    );
                },
                li({ children }) {
                    return <li className="text-[#d5aec4]">{children}</li>;
                },
                // Custom styling for links
                a({ href, children }) {
                    return (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 underline transition-colors"
                        >
                            {children}
                        </a>
                    );
                },
                // Custom styling for tables
                table({ children }) {
                    return (
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full border border-white/20 rounded-lg">
                                {children}
                            </table>
                        </div>
                    );
                },
                th({ children }) {
                    return (
                        <th className="border border-white/20 px-4 py-2 bg-white/5 text-left font-semibold text-[#d5aec4]">
                            {children}
                        </th>
                    );
                },
                td({ children }) {
                    return (
                        <td className="border border-white/20 px-4 py-2 text-[#d5aec4]">
                            {children}
                        </td>
                    );
                },
                // Custom styling for paragraphs
                p({ children }) {
                    return <p className="mb-3 last:mb-0">{children}</p>;
                },
                // Custom styling for horizontal rules
                hr() {
                    return <hr className="my-6 border-white/20" />;
                },
            }}
        >
            {content}
        </ReactMarkdown>
    );
};
