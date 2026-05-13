import { CheckCircle2, Circle, Files } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';

export default function ChatSidebar() {
    const { documents, selectedDocumentIds, setSelectedDocuments, toggleDocumentSelection } = useDocuments();
    const readyDocuments = documents.filter(doc => doc.status === 'completed');

    return (
        <aside className="col-span-1 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-4">
                <div className="flex items-center gap-2">
                    <Files className="h-4 w-4 text-slate-500" />
                    <h3 className="font-semibold text-slate-950">Search Scope</h3>
                </div>
                <p className="mt-1 text-sm text-slate-500">{readyDocuments.length} ready documents</p>
            </div>

            <div className="space-y-1 p-2">
                <button
                    type="button"
                    onClick={() => setSelectedDocuments([])}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                        selectedDocumentIds.length === 0
                            ? 'bg-slate-950 text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    {selectedDocumentIds.length === 0 ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    All ready documents
                </button>

                {documents.map(doc => {
                    const isReady = doc.status === 'completed';
                    const isSelected = selectedDocumentIds.includes(doc.id);

                    return (
                        <button
                            type="button"
                            key={doc.id}
                            onClick={() => isReady && toggleDocumentSelection(doc.id)}
                            disabled={!isReady}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                                isSelected
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'text-slate-700 hover:bg-slate-50'
                            } disabled:cursor-not-allowed disabled:text-slate-400`}
                            title={isReady ? doc.title : `${doc.title} is ${doc.status}`}
                        >
                            {isSelected ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                            <span className="truncate">{doc.title}</span>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
