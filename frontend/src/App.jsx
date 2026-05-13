import { useState } from 'react';
import { DocumentProvider } from './context/DocumentContext';
import { useDocumentQuery } from './hooks/useDocumentQuery';
import Header from './components/Header';
import DocumentUpload from './components/DocumentUpload';
import DocumentList from './components/DocumentList';
import ChatSidebar from './components/ChatSidebar';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';

function AppContent() {
  const [activeView, setActiveView] = useState('upload');
  const { sendQuery, isQuerying } = useDocumentQuery();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <Header activeView={activeView} setActiveView={setActiveView} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeView === 'upload' ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <DocumentUpload />
            <DocumentList />
          </div>
        ) : (
          <div className="grid min-h-[calc(100vh-8.5rem)] gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <ChatSidebar />
            <section className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <ChatMessages isLoading={isQuerying} />
              <ChatInput onSendQuery={sendQuery} isLoading={isQuerying} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DocumentProvider>
      <AppContent />
    </DocumentProvider>
  );
}
