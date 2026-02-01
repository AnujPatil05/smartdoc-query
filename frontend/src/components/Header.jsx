import { FileText, Upload, MessageSquare } from 'lucide-react';

export default function Header({ activeView, setActiveView }) {
    return (
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
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeView === 'upload'
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            <Upload className="w-4 h-4 inline mr-2" />
                            Upload
                        </button>
                        <button
                            onClick={() => setActiveView('chat')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeView === 'chat'
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
    );
}
