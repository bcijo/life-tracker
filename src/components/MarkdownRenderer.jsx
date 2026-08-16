import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ExternalLink } from 'lucide-react';

const CodeBlock = ({ language, value }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    return (
        <div className="markdown-code-wrapper">
            <div className="markdown-code-header">
                <span className="markdown-code-lang">{language || 'code'}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="markdown-copy-btn"
                    aria-label="Copy code to clipboard"
                >
                    {copied ? (
                        <>
                            <Check size={13} style={{ color: '#48bb78' }} />
                            <span style={{ color: '#48bb78' }}>Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy size={13} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="markdown-code-pre">
                <code>{value}</code>
            </pre>
        </div>
    );
};

const MarkdownRenderer = ({ content, className = '' }) => {
    if (!content) return null;

    return (
        <div className={`markdown-body ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Custom Code Renderer (inline vs block)
                    code({ node, inline, className: codeClassName, children, ...props }) {
                        const match = /language-(\w+)/.exec(codeClassName || '');
                        const codeText = String(children).replace(/\n$/, '');
                        
                        // Inline code if no language class and no line breaks
                        const isInline = inline || (!match && !codeText.includes('\n'));

                        if (isInline) {
                            return (
                                <code className="markdown-inline-code" {...props}>
                                    {children}
                                </code>
                            );
                        }

                        return (
                            <CodeBlock
                                language={match ? match[1] : ''}
                                value={codeText}
                            />
                        );
                    },
                    // Clean pre wrapper to avoid nested pre tags
                    pre({ children }) {
                        return <>{children}</>;
                    },
                    // Tables with responsive wrapper
                    table({ children }) {
                        return (
                            <div className="markdown-table-wrapper">
                                <table className="markdown-table">
                                    {children}
                                </table>
                            </div>
                        );
                    },
                    // External Links
                    a({ href, children, ...props }) {
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="markdown-link"
                                {...props}
                            >
                                <span>{children}</span>
                                <ExternalLink size={12} className="markdown-link-icon" />
                            </a>
                        );
                    },
                    // Headings with clean anchors/classes
                    h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
                    h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
                    h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
                    h4: ({ children }) => <h4 className="markdown-h4">{children}</h4>,
                    h5: ({ children }) => <h5 className="markdown-h5">{children}</h5>,
                    h6: ({ children }) => <h6 className="markdown-h6">{children}</h6>,
                    // Paragraphs
                    p: ({ children }) => <p className="markdown-p">{children}</p>,
                    // Blockquotes
                    blockquote: ({ children }) => (
                        <blockquote className="markdown-blockquote">
                            {children}
                        </blockquote>
                    ),
                    // Lists
                    ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
                    ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
                    li: ({ children }) => <li className="markdown-li">{children}</li>,
                    // Horizontal Rule
                    hr: () => <hr className="markdown-hr" />,
                    // Strong & Em
                    strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
                    em: ({ children }) => <em className="markdown-em">{children}</em>,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
