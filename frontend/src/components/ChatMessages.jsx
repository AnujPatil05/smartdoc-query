import { useEffect, useRef } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useDocuments } from '../context/DocumentContext';

export default function ChatMessages({ isLoading }) {
    const { messages } = useDocuments();
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto p-6">
                <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">Ask a question</h3>
                    <p className="text-slate-500 mt-2">Upload documents and start asking questions</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
                <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                        className={`max-w-2xl rounded-lg p-4 ${msg.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : msg.error
                                    ? 'bg-red-50 border border-red-200'
                                    : 'bg-slate-50 border border-slate-200'
                            }`}
                    >
                        <p className={msg.role === 'user' ? 'text-white' : 'text-slate-900'}>
                            {msg.content}
                        </p>

                        {/* Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <p className="text-xs font-semibold text-slate-600 mb-2">Sources:</p>
                                {msg.citations.map((cite, i) => (
                                    <div
                                        key={i}
                                        className="text-xs bg-white rounded p-2 mb-2 border border-slate-200"
                                    >
                                        <p className="font-medium text-slate-700">{cite.document_title}</p>
                                        <p className="text-slate-500">Page {cite.page_number}</p>
                                        <p className="text-slate-600 mt-1 italic">"{cite.text_preview}"</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Cache/timing info */}
                        {msg.cacheHit !== undefined && (
                            <p className="text-xs text-slate-500 mt-2">
                                {msg.cacheHit ? '⚡ Cached' : '🔍 Fresh'} • {msg.processingTime}ms
                            </p>
                        )}
                    </div>
                </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
