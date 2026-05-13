import { useEffect, useRef } from 'react';
import { Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';

export default function ChatMessages({ isLoading }) {
    const { messages } = useDocuments();
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    if (messages.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
                <div className="max-w-md text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <MessageSquare className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-950">Ask from your document set</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Choose a scope on the left, then ask a specific question. Answers will include source snippets when the model finds supporting context.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-5">
            <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';

                    return (
                        <div key={`${msg.role}-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                                    isUser
                                        ? 'bg-slate-950 text-white'
                                        : msg.error
                                            ? 'border border-rose-200 bg-rose-50 text-rose-800'
                                            : 'border border-slate-200 bg-white text-slate-900'
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>

                                {msg.citations && msg.citations.length > 0 && (
                                    <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</p>
                                        {msg.citations.map((cite, citationIndex) => (
                                            <div
                                                key={`${cite.chunk_id}-${citationIndex}`}
                                                className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="truncate font-medium text-slate-900">{cite.document_title}</p>
                                                    <span className="shrink-0 text-slate-500">Page {cite.page_number}</span>
                                                </div>
                                                <p className="mt-2 line-clamp-3 text-slate-600">{cite.text_preview}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {msg.cacheHit !== undefined && (
                                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        {msg.cacheHit ? 'Cached answer' : 'Fresh answer'} - {msg.processingTime}ms
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
