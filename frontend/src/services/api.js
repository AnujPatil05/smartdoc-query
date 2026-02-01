const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Base fetch wrapper with error handling
 */
async function fetchWithError(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new ApiError(
                data.detail || data.error || 'Request failed',
                response.status,
                data
            );
        }

        return data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(error.message || 'Network error', 0);
    }
}

/**
 * Document API endpoints
 */
export const documentApi = {
    /**
     * Upload a PDF document
     * @param {File} file - PDF file to upload
     * @returns {Promise<Object>} Upload result with document_id
     */
    upload: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        return fetchWithError(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData,
        });
    },

    /**
     * Get list of all documents
     * @returns {Promise<Object>} List of documents
     */
    getAll: async () => {
        return fetchWithError(`${API_BASE}/documents`);
    },

    /**
     * Get a specific document by ID
     * @param {string} documentId 
     * @returns {Promise<Object>} Document details
     */
    getById: async (documentId) => {
        return fetchWithError(`${API_BASE}/documents/${documentId}`);
    },

    /**
     * Delete a document
     * @param {string} documentId 
     * @returns {Promise<Object>} Deletion confirmation
     */
    delete: async (documentId) => {
        return fetchWithError(`${API_BASE}/documents/${documentId}`, {
            method: 'DELETE',
        });
    },
};

/**
 * Query API endpoints
 */
export const queryApi = {
    /**
     * Send a query about documents
     * @param {Object} params Query parameters
     * @param {string} params.query - The question to ask
     * @param {string|null} params.conversationId - Existing conversation ID
     * @param {string[]|null} params.documentIds - Filter to specific documents
     * @param {number} params.topK - Number of chunks to retrieve
     * @returns {Promise<Object>} Query response with answer and citations
     */
    ask: async ({ query, conversationId = null, documentIds = null, topK = 5 }) => {
        return fetchWithError(`${API_BASE}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                conversation_id: conversationId,
                document_ids: documentIds && documentIds.length > 0 ? documentIds : null,
                top_k: topK,
            }),
        });
    },
};

/**
 * Conversation API endpoints
 */
export const conversationApi = {
    /**
     * Get conversation history
     * @param {string} conversationId 
     * @returns {Promise<Object>} Conversation with messages
     */
    get: async (conversationId) => {
        return fetchWithError(`${API_BASE}/conversations/${conversationId}`);
    },

    /**
     * Get all conversations
     * @returns {Promise<Object>} List of conversations
     */
    getAll: async () => {
        return fetchWithError(`${API_BASE}/conversations`);
    },
};

/**
 * Health check
 */
export const healthApi = {
    check: async () => {
        return fetchWithError(`${API_BASE.replace('/api/v1', '')}/health`);
    },
};

export { ApiError };
