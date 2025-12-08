import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, X, Loader2, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';


export default function SmartDocApp() {
  const [activeView, setActiveView] = useState('upload'); // 'upload' or 'chat'
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Upload document
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadProgress({ name: file.name, status: 'uploading' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setDocuments(prev => [...prev, {
          id: data.document_id,
          title: data.title,
          pageCount: data.page_count,
          chunkCount: data.chunk_count,
          status: data.status,
        }]);
        setUploadProgress({ name: file.name, status: 'completed' });
        setTimeout(() => setUploadProgress(null), 2000);
      } else {
        setUploadProgress({ name: file.name, status: 'failed', error: data.error });
      }
    } catch (error) {
      setUploadProgress({ name: file.name, status: 'failed', error: 'Network error' });
    }
  };

  // Send query
  const handleSendQuery = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          conversation_id: conversationId,
          document_ids: selectedDocuments.length > 0 ? selectedDocuments : null,
          top_k: 5,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConversationId(data.conversation_id);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
          cache_hit: data.cache_hit,
          processing_time: data.processing_time_ms,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your question.',
          error: true,
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Network error. Please check your connection.',
        error: true,
      }]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">SmartDoc Query</h1>
                <p className="text-sm text-slate-500">AI-Powered Document Intelligence</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveView('upload')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeView === 'upload'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeView === 'chat'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Chat
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'upload' ? (
          // Upload View
          <div className="space-y-6">
            {/* Upload Area */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Upload Documents</h2>
              <label className="block">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
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
                  <span className="text-xs text-slate-500">{uploadProgress.status}</span>
                </div>
              )}
            </div>

            {/* Document List */}
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
                          className={`text-xs px-2 py-1 rounded ${
                            doc.status === 'completed'
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
          </div>
        ) : (
          // Chat View
          <div className="grid grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
            {/* Sidebar - Document Selection */}
            <div className="col-span-1 bg-white rounded-xl shadow-md p-4 overflow-y-auto">
              <h3 className="font-semibold text-slate-900 mb-3">Search In:</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.length === 0}
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
                      checked={selectedDocuments.includes(doc.id)}
                      onChange={() => toggleDocumentSelection(doc.id)}
                      className="rounded text-blue-500"
                    />
                    <span className="text-sm text-slate-700 truncate">{doc.title}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="col-span-3 bg-white rounded-xl shadow-md flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">Ask a question</h3>
                    <p className="text-slate-500 mt-2">Upload documents and start asking questions</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-2xl rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : msg.error
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-slate-50 border border-slate-200'
                        }`}
                      >
                        <p className={msg.role === 'user' ? 'text-white' : 'text-slate-900'}>
                          {msg.content}
                        </p>
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-xs font-semibold text-slate-600 mb-2">Sources:</p>
                            {msg.citations.map((cite, i) => (
                              <div
                                key={i}
                                className="text-xs bg-white rounded p-2 mb-2 border border-slate-200"
                              >
                                <p className="font-medium text-slate-700">{cite.document_title}</p>
                                <p className="text-slate-500">Page {cite.page_number}</p>
                                <p className="text-slate-600 mt-1 italic">"{cite.text_preview}"</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {msg.cache_hit !== undefined && (
                          <p className="text-xs text-slate-500 mt-2">
                            {msg.cache_hit ? '⚡ Cached' : '🔍 Fresh'} • {msg.processing_time}ms
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-slate-200 p-4">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about your documents..."
                    disabled={isLoading || documents.length === 0}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleSendQuery}
                    disabled={isLoading || !query.trim() || documents.length === 0}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}