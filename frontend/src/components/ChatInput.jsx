import { useState } from 'react';
import { Send } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';

export default function ChatInput({ onSendQuery, isLoading }) {
    const [query, setQuery] = useState('');
    const { documents } = useDocuments();

    const readyCount = documents.filter(doc => doc.status === 'completed').length;
    const isDisabled = isLoading || readyCount === 0;

    const handleSubmit = () => {
        const trimmed = query.trim();
        if (trimmed && !isDisabled) {
            onSendQuery(trimmed);
            setQuery('');
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="border-t border-slate-200 bg-white p-4">
            <div className="flex items-end gap-3">
                <textarea
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder={readyCount === 0
                        ? 'Wait for a document to finish processing...'
                        : 'Ask a question about your documents...'}
                    disabled={isDisabled}
                    className="max-h-32 min-h-12 flex-1 resize-none rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isDisabled || !query.trim()}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    title="Send question"
                >
                    <Send className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
