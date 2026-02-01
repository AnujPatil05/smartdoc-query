import { FileText } from 'lucide-react';
import { useDocuments } from '../context/DocumentContext';

export default function DocumentList() {
    const { documents } = useDocuments();

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Your Documents ({documents.length})
            </h2>
            {documents.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No documents uploaded yet</p>
            ) : (
                <div className="space-y-3">
                    {documents.map(doc => (
                        <div
                            key={doc.id}
                            className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                    <FileText className="w-5 h-5 text-blue-500 mt-1" />
                                    <div>
                                        <h3 className="font-medium text-slate-900">{doc.title}</h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {doc.pageCount} pages • {doc.chunkCount} chunks
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`text-xs px-2 py-1 rounded ${doc.status === 'completed'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}
                                >
                                    {doc.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
