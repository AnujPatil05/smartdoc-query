import { useState, useCallback } from 'react';
import { documentApi, ApiError } from '../services/api';
import { useDocuments } from '../context/DocumentContext';

/**
 * Custom hook for handling document uploads
 */
export function useDocumentUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const { addDocument, setUploadProgress } = useDocuments();

    const uploadDocument = useCallback(async (file) => {
        // Validation
        if (!file) return null;

        if (file.type !== 'application/pdf') {
            setUploadProgress({ name: file.name, status: 'failed', error: 'Please upload a PDF file' });
            return null;
        }

        if (file.size > 10 * 1024 * 1024) {
            setUploadProgress({ name: file.name, status: 'failed', error: 'File size must be less than 10MB' });
            return null;
        }

        setIsUploading(true);
        setUploadProgress({ name: file.name, status: 'uploading' });

        try {
            const result = await documentApi.upload(file);

            // Add to global state
            addDocument({
                id: result.document_id,
                title: result.title,
                pageCount: result.page_count,
                chunkCount: result.chunk_count,
                status: result.status,
            });

            setUploadProgress({ name: file.name, status: 'completed' });

            // Clear progress after 2 seconds
            setTimeout(() => setUploadProgress(null), 2000);

            return result;
        } catch (err) {
            const errorMessage = err instanceof ApiError ? err.message : 'Upload failed';
            setUploadProgress({ name: file.name, status: 'failed', error: errorMessage });
            return null;
        } finally {
            setIsUploading(false);
        }
    }, [addDocument, setUploadProgress]);

    return {
        uploadDocument,
        isUploading,
    };
}
