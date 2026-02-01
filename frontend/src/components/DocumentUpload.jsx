import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useDocuments } from '../context/DocumentContext';
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
        <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Upload Documents</h2>
            <label className="block cursor-pointer">
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-lg font-medium text-slate-700">Click to upload PDF</p>
                    <p className="text-sm text-slate-500 mt-2">Maximum file size: 10MB</p>
                </div>
            </label>

            {uploadProgress && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {uploadProgress.status === 'uploading' && (
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        )}
                        {uploadProgress.status === 'completed' && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {uploadProgress.status === 'failed' && (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="text-sm font-medium text-slate-700">{uploadProgress.name}</span>
                    </div>
                    <span className={`text-xs ${uploadProgress.status === 'failed' ? 'text-red-500' : 'text-slate-500'
                        }`}>
                        {uploadProgress.status === 'failed' ? uploadProgress.error : uploadProgress.status}
                    </span>
                </div>
            )}
        </div>
    );
}
