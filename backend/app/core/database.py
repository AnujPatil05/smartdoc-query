# backend/app/core/database.py
from databases import Database
from sqlalchemy import create_engine, MetaData
import asyncpg
from app.core.config import settings

database = Database(settings.DATABASE_URL)
metadata = MetaData()
engine = create_engine(settings.DATABASE_URL)

async def init_db():
    """Initialize database with pgvector extension and tables"""
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    try:
        # Enable pgvector extension
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        
        # Create documents table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                filename VARCHAR(255) NOT NULL,
                file_size INTEGER NOT NULL,
                page_count INTEGER NOT NULL,
                upload_timestamp TIMESTAMPTZ DEFAULT NOW(),
                processing_status VARCHAR(50) DEFAULT 'processing',
                user_id VARCHAR(100),
                metadata JSONB,
                CONSTRAINT check_status CHECK (processing_status IN ('processing', 'completed', 'failed'))
            );
        """)
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
            CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
        """)
        
        # Create chunks table with vector embeddings
        await conn.execute(f"""
            CREATE TABLE IF NOT EXISTS chunks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                page_number INTEGER,
                char_count INTEGER,
                token_count INTEGER,
                embedding vector({settings.EMBEDDING_DIMENSION}),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT unique_chunk_per_doc UNIQUE(document_id, chunk_index)
            );
        """)
        
        # Create HNSW index for fast vector search
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks 
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64);
            
            CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
        """)
        
        # Create conversations table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(100),
                title VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
        """)
        
        # Create messages table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                citations JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT check_role CHECK (role IN ('user', 'assistant'))
            );
            
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
        """)
        
        print("✅ Database schema initialized")
        
    finally:
        await conn.close()