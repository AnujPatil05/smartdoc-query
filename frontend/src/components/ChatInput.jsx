import { useState } from 'react';
import { Send } from 'lucide-react';
import { useDocuments } from '../context/DocumentContext';

export default function ChatInput({ onSendQuery, isLoading }) {
    const [query, setQuery] = useState('');
    const { documents } = useDocuments();

    const handleSubmit = () => {
        if (query.trim() && !isLoading) {
            onSendQuery(query);
            setQuery('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const isDisabled = isLoading || documents.length === 0;

    return (
        <div className="border-t border-slate-200 p-4">
            <div className="flex space-x-3">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={documents.length === 0
                        ? "Upload documents first..."
                        : "Ask a question about your documents..."}
                    disabled={isDisabled}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <button
                    onClick={handleSubmit}
                    disabled={isDisabled || !query.trim()}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
