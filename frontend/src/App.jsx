import { useState } from 'react';
import { DocumentProvider } from './context/DocumentContext';
import { useDocumentQuery } from './hooks/useDocumentQuery';
import Header from './components/Header';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import ChatSidebar from './components/ChatSidebar';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';

// Main app content that uses context
function AppContent() {
  const [activeView, setActiveView] = useState('upload');
  const { sendQuery, isQuerying } = useDocumentQuery();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header activeView={activeView} setActiveView={setActiveView} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'upload' ? (
          // Upload View
          <div className="space-y-6">
            <DocumentUpload />
            <DocumentList />
          </div>
        ) : (
          // Chat View
          <div className="grid grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
            <ChatSidebar />
            <div className="col-span-3 bg-white rounded-xl shadow-md flex flex-col">
              <ChatMessages isLoading={isQuerying} />
              <ChatInput onSendQuery={sendQuery} isLoading={isQuerying} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Root app with provider wrapper
export default function App() {
  return (
    <DocumentProvider>
      <AppContent />
    </DocumentProvider>
  );
}