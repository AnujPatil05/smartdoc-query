import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { documentApi } from '../services/api';
import { useDocuments } from '../hooks/useDocuments';

const statusMeta = {
    completed: {
        icon: CheckCircle2,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Ready',
    },
    processing: {
        icon: Clock3,
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Processing',
    },
    failed: {
        icon: AlertTriangle,
        className: 'bg-rose-50 text-rose-700 border-rose-200',
        label: 'Failed',
    },
};

export default function DocumentList() {
    const { documents, setDocuments, updateDocument, removeDocument } = useDocuments();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState(null);

    const hasProcessingDocs = useMemo(
        () => documents.some(doc => doc.status === 'processing'),
        [documents],
    );

    const refreshDocuments = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setIsRefreshing(true);
        setError(null);

        try {
            const result = await documentApi.getAll();
            setDocuments(result.documents);
        } catch (err) {
            setError(err.message || 'Could not load documents');
        } finally {
            if (!silent) setIsRefreshing(false);
        }
    }, [setDocuments]);

    useEffect(() => {
        refreshDocuments({ silent: true });
    }, [refreshDocuments]);

    useEffect(() => {
        if (!hasProcessingDocs) return undefined;

        const intervalId = window.setInterval(async () => {
            const processingDocs = documents.filter(doc => doc.status === 'processing');
            await Promise.all(processingDocs.map(async (doc) => {
                try {
                    const latest = await documentApi.getById(doc.id);
                    updateDocument(latest);
                } catch {
                    // Keep the previous optimistic row if one status check fails.
                }
            }));
        }, 3000);

        return () => window.clearInterval(intervalId);
    }, [documents, hasProcessingDocs, updateDocument]);

    const handleDelete = async (documentId) => {
        setDeletingId(documentId);
        setError(null);

        try {
            await documentApi.delete(documentId);
            removeDocument(documentId);
        } catch (err) {
            setError(err.message || 'Could not delete document');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <section className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-950">Documents</h2>
                    <p className="text-sm text-slate-500">{documents.length} uploaded</p>
                </div>
                <button
                    type="button"
                    onClick={() => refreshDocuments()}
                    disabled={isRefreshing}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Refresh documents"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="mx-5 mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                </div>
            )}

            {documents.length === 0 ? (
                <div className="px-5 py-10 text-center">
                    <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="font-medium text-slate-700">No documents yet</p>
                    <p className="mt-1 text-sm text-slate-500">Upload a PDF to create a searchable knowledge base.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {documents.map(doc => {
                        const meta = statusMeta[doc.status] || statusMeta.processing;
                        const StatusIcon = meta.icon;
                        const isDeleting = deletingId === doc.id;

                        return (
                            <article key={doc.id} className="group flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="truncate font-medium text-slate-950">{doc.title}</h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {doc.pageCount} pages - {doc.chunkCount} chunks
                                        </p>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${meta.className}`}>
                                        <StatusIcon className="h-3.5 w-3.5" />
                                        {meta.label}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(doc.id)}
                                        disabled={isDeleting}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 group-hover:opacity-100"
                                        title="Delete document"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
