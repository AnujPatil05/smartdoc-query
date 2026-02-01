import { createContext, useContext, useReducer, useCallback } from 'react';

// Initial state
const initialState = {
  documents: [],
  selectedDocumentIds: [],
  conversationId: null,
  messages: [],
  isLoading: false,
  uploadProgress: null,
};

// Action types
const ACTIONS = {
  ADD_DOCUMENT: 'ADD_DOCUMENT',
  SET_DOCUMENTS: 'SET_DOCUMENTS',
  SET_SELECTED_DOCUMENTS: 'SET_SELECTED_DOCUMENTS',
  TOGGLE_DOCUMENT_SELECTION: 'TOGGLE_DOCUMENT_SELECTION',
  SET_CONVERSATION_ID: 'SET_CONVERSATION_ID',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_MESSAGES: 'SET_MESSAGES',
  SET_LOADING: 'SET_LOADING',
  SET_UPLOAD_PROGRESS: 'SET_UPLOAD_PROGRESS',
  CLEAR_CONVERSATION: 'CLEAR_CONVERSATION',
};

// Reducer
function documentReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_DOCUMENT:
      return { ...state, documents: [...state.documents, action.payload] };
    
    case ACTIONS.SET_DOCUMENTS:
      return { ...state, documents: action.payload };
    
    case ACTIONS.SET_SELECTED_DOCUMENTS:
      return { ...state, selectedDocumentIds: action.payload };
    
    case ACTIONS.TOGGLE_DOCUMENT_SELECTION: {
      const docId = action.payload;
      const isSelected = state.selectedDocumentIds.includes(docId);
      return {
        ...state,
        selectedDocumentIds: isSelected
          ? state.selectedDocumentIds.filter(id => id !== docId)
          : [...state.selectedDocumentIds, docId],
      };
    }
    
    case ACTIONS.SET_CONVERSATION_ID:
      return { ...state, conversationId: action.payload };
    
    case ACTIONS.ADD_MESSAGE:
      return { ...state, messages: [...state.messages, action.payload] };
    
    case ACTIONS.SET_MESSAGES:
      return { ...state, messages: action.payload };
    
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case ACTIONS.SET_UPLOAD_PROGRESS:
      return { ...state, uploadProgress: action.payload };
    
    case ACTIONS.CLEAR_CONVERSATION:
      return { ...state, messages: [], conversationId: null };
    
    default:
      return state;
  }
}

// Create context
const DocumentContext = createContext(null);

// Provider component
export function DocumentProvider({ children }) {
  const [state, dispatch] = useReducer(documentReducer, initialState);

  // Action creators
  const addDocument = useCallback((doc) => {
    dispatch({ type: ACTIONS.ADD_DOCUMENT, payload: doc });
  }, []);

  const setSelectedDocuments = useCallback((ids) => {
    dispatch({ type: ACTIONS.SET_SELECTED_DOCUMENTS, payload: ids });
  }, []);

  const toggleDocumentSelection = useCallback((docId) => {
    dispatch({ type: ACTIONS.TOGGLE_DOCUMENT_SELECTION, payload: docId });
  }, []);

  const setConversationId = useCallback((id) => {
    dispatch({ type: ACTIONS.SET_CONVERSATION_ID, payload: id });
  }, []);

  const addMessage = useCallback((message) => {
    dispatch({ type: ACTIONS.ADD_MESSAGE, payload: message });
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
  }, []);

  const setUploadProgress = useCallback((progress) => {
    dispatch({ type: ACTIONS.SET_UPLOAD_PROGRESS, payload: progress });
  }, []);

  const clearConversation = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_CONVERSATION });
  }, []);

  const value = {
    // State
    documents: state.documents,
    selectedDocumentIds: state.selectedDocumentIds,
    conversationId: state.conversationId,
    messages: state.messages,
    isLoading: state.isLoading,
    uploadProgress: state.uploadProgress,
    // Actions
    addDocument,
    setSelectedDocuments,
    toggleDocumentSelection,
    setConversationId,
    addMessage,
    setLoading,
    setUploadProgress,
    clearConversation,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}

// Custom hook to use the context
export function useDocuments() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}

export { ACTIONS };
