import { FileText, MessageSquare, Upload } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';

export default function Header({ activeView, setActiveView }) {
    const { documents } = useDocuments();
    const readyCount = documents.filter(doc => doc.status === 'completed').length;

    return (
        <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-bold text-slate-950">SmartDoc Query</h1>
                        <p className="text-sm text-slate-500">{readyCount}/{documents.length} documents ready</p>
                    </div>
                </div>

                <nav className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
                    <button
                        type="button"
                        onClick={() => setActiveView('upload')}
                        className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition ${
                            activeView === 'upload'
                                ? 'bg-white text-slate-950 shadow-sm'
                                : 'text-slate-600 hover:text-slate-950'
                        }`}
                    >
                        <Upload className="h-4 w-4" />
                        Upload
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView('chat')}
                        className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition ${
                            activeView === 'chat'
                                ? 'bg-white text-slate-950 shadow-sm'
                                : 'text-slate-600 hover:text-slate-950'
                        }`}
                    >
                        <MessageSquare className="h-4 w-4" />
                        Chat
                    </button>
                </nav>
            </div>
        </header>
    );
}
