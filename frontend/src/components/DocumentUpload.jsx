import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { useDocumentUpload } from '../hooks/useDocumentUpload';

export default function DocumentUpload() {
    const { uploadProgress } = useDocuments();
    const { uploadDocument } = useDocumentUpload();

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadDocument(file);
        }
        // Reset input so same file can be uploaded again if needed
        event.target.value = '';
    };

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-950">Upload PDF</h2>
                <p className="mt-1 text-sm text-slate-500">Files are chunked, embedded, and indexed for semantic search.</p>
            </div>
            <label className="block cursor-pointer">
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center transition hover:border-slate-500 hover:bg-white">
                    <Upload className="mx-auto mb-4 h-10 w-10 text-slate-400" />
                    <p className="font-medium text-slate-800">Click to upload a PDF</p>
                    <p className="mt-2 text-sm text-slate-500">Maximum file size: 10MB</p>
                </div>
            </label>

            {uploadProgress && (
                <div className="mt-4 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center space-x-3">
                        {uploadProgress.status === 'uploading' && (
                            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                        )}
                        {uploadProgress.status === 'completed' || uploadProgress.status === 'processing' ? (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : null}
                        {uploadProgress.status === 'failed' && (
                            <AlertCircle className="h-5 w-5 text-rose-600" />
                        )}
                        <span className="text-sm font-medium text-slate-700">{uploadProgress.name}</span>
                    </div>
                    <span className={`text-xs ${uploadProgress.status === 'failed' ? 'text-red-500' : 'text-slate-500'
                        }`}>
                        {uploadProgress.status === 'failed' ? uploadProgress.error : uploadProgress.status}
                    </span>
                </div>
            )}
        </section>
    );
}
