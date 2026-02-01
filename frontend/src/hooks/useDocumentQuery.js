import { useState, useCallback } from 'react';
import { queryApi, ApiError } from '../services/api';
import { useDocuments } from '../context/DocumentContext';

/**
 * Custom hook for handling document queries
 * Demonstrates proper async state management pattern
 */
export function useDocumentQuery() {
    const [isQuerying, setIsQuerying] = useState(false);
    const [error, setError] = useState(null);

    const {
        conversationId,
        selectedDocumentIds,
        setConversationId,
        addMessage,
    } = useDocuments();

    const sendQuery = useCallback(async (queryText) => {
        if (!queryText.trim() || isQuerying) return null;

        setIsQuerying(true);
        setError(null);

        // Add user message immediately (optimistic update)
        addMessage({
            role: 'user',
            content: queryText,
        });

        try {
            const result = await queryApi.ask({
                query: queryText,
                conversationId,
                documentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : null,
                topK: 5,
            });

            // Update conversation ID if new
            if (result.conversation_id) {
                setConversationId(result.conversation_id);
            }

            // Add assistant response
            addMessage({
                role: 'assistant',
                content: result.answer,
                citations: result.citations,
                cacheHit: result.cache_hit,
                processingTime: result.processing_time_ms,
            });

            return result;
        } catch (err) {
            const errorMessage = err instanceof ApiError
                ? err.message
                : 'Network error. Please check your connection.';

            setError(errorMessage);

            // Add error message
            addMessage({
                role: 'assistant',
                content: errorMessage,
                error: true,
            });

            return null;
        } finally {
            setIsQuerying(false);
        }
    }, [conversationId, selectedDocumentIds, addMessage, setConversationId, isQuerying]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        sendQuery,
        isQuerying,
        error,
        clearError,
    };
}
