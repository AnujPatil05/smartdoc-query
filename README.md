# SmartDoc Query Engine

> AI-powered document intelligence platform with semantic search

React + FastAPI + PostgreSQL/pgvector + Redis + Google Gemini

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Tailwind CSS, Context API |
| **Backend** | FastAPI, Pydantic |
| **Database** | PostgreSQL + pgvector (semantic search) |
| **Cache** | Redis (embeddings + query cache) |
| **AI** | Google Gemini (embeddings + LLM) |

📦 **[Deployment Guide](./DEPLOYMENT.md)** — Deploy to Vercel + Railway + Upstash

## Architecture

```
┌───────────────────────┐
│   React Frontend      │
│   Context API State   │
└───────────┬───────────┘
            │ REST API
            ▼
┌───────────────────────┐
│   FastAPI Backend     │
│   /upload  /query     │
└───────────┬───────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
┌─────────┐   ┌─────────────┐
│  Redis  │   │  PostgreSQL │
│  Cache  │   │  + pgvector │
└─────────┘   └─────────────┘
```

## Frontend Structure

```
frontend/src/
├── components/          # UI components
│   ├── Header.jsx
│   ├── DocumentUpload.jsx
│   ├── DocumentList.jsx
│   ├── ChatSidebar.jsx
│   ├── ChatMessages.jsx
│   └── ChatInput.jsx
├── context/             # Global state
│   └── DocumentContext.jsx
├── hooks/               # Custom hooks
│   ├── useDocumentQuery.js
│   └── useDocumentUpload.js
├── services/            # API layer
│   └── api.js
└── App.jsx              # Main app
```

## Key Features

- **PDF Upload & Processing** — Extract, chunk, and embed documents
- **Semantic Search** — Vector similarity search with pgvector
- **AI-Powered Q&A** — Context-aware answers with citations
- **Response Caching** — Redis-backed caching for performance

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL with pgvector extension
- Redis
- Google API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your GOOGLE_API_KEY and DATABASE_URL

# Run server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

### Database Setup

The backend initializes and upgrades the schema on startup. To run it manually:

```bash
cd backend
python setup_db.py
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `GOOGLE_API_KEY` | Google Gemini API key |
| `CORS_ORIGINS` | Allowed frontend origins |

## Deployment Options (Cloud)

| Component | Free Tier Options |
|-----------|-------------------|
| Frontend | Vercel, Netlify |
| Backend | Railway, Render, Fly.io |
| Database | Supabase (PostgreSQL + pgvector), Neon |
| Redis | Upstash |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/upload` | Upload PDF document |
| GET | `/api/v1/documents` | List all documents |
| GET | `/api/v1/documents/{id}` | Get document status |
| DELETE | `/api/v1/documents/{id}` | Delete a document |
| POST | `/api/v1/query` | Ask a question |
| GET | `/api/v1/conversations` | List conversations |
| GET | `/api/v1/conversations/{id}` | Get conversation history |
| DELETE | `/api/v1/conversations/{id}` | Delete a conversation |

## License

MIT
