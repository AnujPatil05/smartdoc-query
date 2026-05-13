import asyncpg
from databases import Database

from app.core.config import settings

database = Database(settings.DATABASE_URL)


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
                file_size INTEGER NOT NULL DEFAULT 0,
                page_count INTEGER NOT NULL DEFAULT 0,
                upload_timestamp TIMESTAMPTZ DEFAULT NOW(),
                processing_status VARCHAR(50) DEFAULT 'processing',
                user_id VARCHAR(100),
                metadata JSONB,
                CONSTRAINT check_status CHECK (processing_status IN ('processing', 'completed', 'failed'))
            );
        """)

        # Upgrade databases created by older setup scripts.
        await conn.execute("""
            ALTER TABLE documents ADD COLUMN IF NOT EXISTS title VARCHAR(255);
            ALTER TABLE documents ADD COLUMN IF NOT EXISTS filename VARCHAR(255);
            ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0;
            ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 0;
            ALTER TABLE documents ADD COLUMN IF NOT EXISTS upload_timestamp TIMESTAMPTZ;
            ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'processing';
            ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
            ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB;

            UPDATE documents
            SET upload_timestamp = COALESCE(upload_timestamp, NOW())
            WHERE upload_timestamp IS NULL;

            UPDATE documents
            SET processing_status = 'processing'
            WHERE processing_status IS NULL OR processing_status = 'pending';

            ALTER TABLE documents ALTER COLUMN file_size SET DEFAULT 0;
            ALTER TABLE documents ALTER COLUMN file_size SET NOT NULL;
            ALTER TABLE documents ALTER COLUMN page_count SET DEFAULT 0;
            ALTER TABLE documents ALTER COLUMN page_count SET NOT NULL;
            ALTER TABLE documents ALTER COLUMN upload_timestamp SET DEFAULT NOW();
            ALTER TABLE documents ALTER COLUMN processing_status SET DEFAULT 'processing';
        """)

        await conn.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'check_status'
                    AND conrelid = 'documents'::regclass
                ) THEN
                    ALTER TABLE documents
                    ADD CONSTRAINT check_status
                    CHECK (processing_status IN ('processing', 'completed', 'failed'));
                END IF;
            END $$;
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

        await conn.execute(f"""
            ALTER TABLE chunks ADD COLUMN IF NOT EXISTS document_id UUID;
            ALTER TABLE chunks ADD COLUMN IF NOT EXISTS chunk_index INTEGER;
            ALTER TABLE chunks ADD COLUMN IF NOT EXISTS content TEXT;
            ALTER TABLE chunks ADD COLUMN IF NOT EXISTS page_number INTEGER;
            ALTER TABLE chunks ADD COLUMN IF NOT EXISTS char_count INTEGER;
            ALTER TABLE chunks ADD COLUMN IF NOT EXISTS token_count INTEGER;
            ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding vector({settings.EMBEDDING_DIMENSION});
            ALTER TABLE chunks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
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

        await conn.execute("""
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title VARCHAR(255);
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
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

        await conn.execute("""
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS role VARCHAR(20);
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS citations JSONB;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        """)
        
        print("Database schema initialized")
        
    finally:
        await conn.close()
