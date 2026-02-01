import { useDocuments } from '../context/DocumentContext';

export default function ChatSidebar() {
    const { documents, selectedDocumentIds, setSelectedDocuments, toggleDocumentSelection } = useDocuments();

    return (
        <div className="col-span-1 bg-white rounded-xl shadow-md p-4 overflow-y-auto">
            <h3 className="font-semibold text-slate-900 mb-3">Search In:</h3>
            <div className="space-y-2">
                <label className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                        type="checkbox"
                        checked={selectedDocumentIds.length === 0}
                        onChange={() => setSelectedDocuments([])}
                        className="rounded text-blue-500"
                    />
                    <span className="text-sm text-slate-700">All Documents</span>
                </label>
                {documents.map(doc => (
                    <label
                        key={doc.id}
                        className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                    >
                        <input
                            type="checkbox"
                            checked={selectedDocumentIds.includes(doc.id)}
                            onChange={() => toggleDocumentSelection(doc.id)}
                            className="rounded text-blue-500"
                        />
                        <span className="text-sm text-slate-700 truncate">{doc.title}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
