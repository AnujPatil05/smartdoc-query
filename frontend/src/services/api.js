const rawApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const API_BASE = rawApiBase.replace(/\/$/, '').endsWith('/api/v1')
    ? rawApiBase.replace(/\/$/, '')
    : `${rawApiBase.replace(/\/$/, '')}/api/v1`;
const API_ROOT = API_BASE.replace(/\/api\/v1$/, '');

class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

async function parseResponse(response) {
    if (response.status === 204) return null;

    const text = await response.text();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return { detail: text };
    }
}

async function fetchWithError(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
            },
        });

        const data = await parseResponse(response);

        if (!response.ok) {
            throw new ApiError(
                data?.detail || data?.error || 'Request failed',
                response.status,
                data,
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

export function normalizeDocument(doc) {
    return {
        id: doc.document_id,
        title: doc.title,
        pageCount: doc.page_count,
        chunkCount: doc.chunk_count,
        status: doc.status,
        uploadTimestamp: doc.upload_timestamp,
        message: doc.message,
    };
}

export const documentApi = {
    upload: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const result = await fetchWithError(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData,
        });

        return normalizeDocument(result);
    },

    getAll: async () => {
        const result = await fetchWithError(`${API_BASE}/documents`);
        return {
            documents: result.documents.map(normalizeDocument),
            total: result.total,
        };
    },

    getById: async (documentId) => {
        const result = await fetchWithError(`${API_BASE}/documents/${documentId}`);
        return normalizeDocument(result);
    },

    delete: async (documentId) => {
        return fetchWithError(`${API_BASE}/documents/${documentId}`, {
            method: 'DELETE',
        });
    },
};

export const queryApi = {
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

export const conversationApi = {
    get: async (conversationId) => {
        return fetchWithError(`${API_BASE}/conversations/${conversationId}`);
    },

    getAll: async () => {
        return fetchWithError(`${API_BASE}/conversations`);
    },

    delete: async (conversationId) => {
        return fetchWithError(`${API_BASE}/conversations/${conversationId}`, {
            method: 'DELETE',
        });
    },
};

export const healthApi = {
    check: async () => {
        return fetchWithError(`${API_ROOT}/health`);
    },
};

export { ApiError };
