"""
Fix missing columns in Supabase database
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# SQL to add missing columns
FIX_SQL = """
-- Add user_id column to conversations if it doesn't exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);

-- Add any other missing columns
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
"""

def main():
    print(f"Connecting to database...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Running schema fixes...")
        cur.execute(FIX_SQL)
        
        print("✅ Schema fixes applied!")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    main()
