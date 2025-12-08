# backend/app/services/document_service.py
import PyPDF2
import io
import re
import tiktoken
from typing import List, Dict
from openai import AsyncOpenAI
import hashlib
import json

from app.core.config import settings
from app.core.database import database
from app.core.redis import get_redis

# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
encoder = tiktoken.encoding_for_model("gpt-4")

class DocumentService:
    
    # MOVE THIS TO THE TOP - Helper methods should be defined first
    @staticmethod
    def _hash_text(text: str) -> str:
        """Create a SHA256 hash of the text for Redis caching keys"""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()
    
    @staticmethod
    async def process_document(file_content: bytes, filename: str, document_id: str) -> Dict:
        """Main document processing pipeline"""
        
        # Extract text from PDF
        pages = await DocumentService.extract_text_from_pdf(file_content)
        
        # Clean text
        cleaned_pages = []
        for page in pages:
            cleaned_text = DocumentService.clean_text(page['text'])
            if cleaned_text.strip():  # Skip empty pages
                cleaned_pages.append({
                    'page_num': page['page_num'],
                    'text': cleaned_text
                })
        
        # Chunk text
        all_chunks = []
        for page in cleaned_pages:
            page_chunks = DocumentService.chunk_text(
                text=page['text'],
                page_num=page['page_num']
            )
            all_chunks.extend(page_chunks)
        
        # Generate embeddings
        embedded_chunks = await DocumentService.generate_embeddings_batch(all_chunks)
        
        # Store in database
        await DocumentService.store_chunks(document_id, embedded_chunks)
        
        # Update document status
        await database.execute(
            """
            UPDATE documents 
            SET processing_status = 'completed'
            WHERE id = :document_id
            """,
            {"document_id": document_id}
        )
        
        return {
            'total_chunks': len(embedded_chunks),
            'status': 'completed'
        }
    
    @staticmethod
    async def extract_text_from_pdf(file_content: bytes) -> List[Dict]:
        """Extract text from PDF with page numbers"""
        pdf_file = io.BytesIO(file_content)
        reader = PyPDF2.PdfReader(pdf_file)
        
        pages = []
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text()
            pages.append({
                'page_num': page_num,
                'text': text
            })
        
        return pages
    
    @staticmethod
    def clean_text(raw_text: str) -> str:
        """Remove noise from PDF text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', raw_text)
        
        # Remove common PDF artifacts
        text = re.sub(r'[^\x00-\x7F]+', ' ', text)  # Remove non-ASCII
        
        # Remove page numbers and headers/footers (heuristic)
        lines = text.split('\n')
        filtered_lines = []
        for i, line in enumerate(lines):
            line = line.strip()
            word_count = len(line.split())
            
            # Skip likely headers/footers
            if word_count < 3 and i < 2:
                continue
            if word_count < 3 and i > len(lines) - 3:
                continue
            
            filtered_lines.append(line)
        
        text = ' '.join(filtered_lines)
        return text.strip()
    
    @staticmethod
    def chunk_text(text: str, page_num: int) -> List[Dict]:
        """Split text into chunks with overlap"""
        chars_per_token = 4
        chunk_chars = settings.CHUNK_SIZE * chars_per_token
        overlap_chars = settings.CHUNK_OVERLAP * chars_per_token
        
        chunks = []
        start = 0
        chunk_index = 0
        
        while start < len(text):
            end = start + chunk_chars
            chunk_text = text[start:end]
            
            # Don't create tiny chunks at the end
            if len(chunk_text) < 100 and chunks:
                chunks[-1]['text'] += ' ' + chunk_text
                break
            
            token_count = len(encoder.encode(chunk_text))
            
            chunks.append({
                'chunk_index': chunk_index,
                'text': chunk_text,
                'page_number': page_num,
                'char_count': len(chunk_text),
                'token_count': token_count
            })
            
            start = end - overlap_chars
            chunk_index += 1
        
        return chunks
    
    @staticmethod
    async def generate_embeddings_batch(chunks: List[Dict], batch_size: int = 20) -> List[Dict]:
        """Generate embeddings with caching"""
        results = []
        
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [chunk['text'] for chunk in batch]
            
            # Check cache
            embeddings = []
            for text in texts:
                cached = await DocumentService.get_cached_embedding(text)
                if cached:
                    embeddings.append(cached)
                else:
                    embeddings.append(None)
            
            # Generate uncached embeddings
            uncached_indices = [i for i, emb in enumerate(embeddings) if emb is None]
            
            if uncached_indices:
                uncached_texts = [texts[i] for i in uncached_indices]
                
                response = await client.embeddings.create(
                    model=settings.EMBEDDING_MODEL,
                    input=uncached_texts
                )
                
                for j, idx in enumerate(uncached_indices):
                    embedding = response.data[j].embedding
                    embeddings[idx] = embedding
                    
                    # Cache embedding
                    await DocumentService.cache_embedding(texts[idx], embedding)
            
            # Add embeddings to chunks
            for j, chunk in enumerate(batch):
                chunk['embedding'] = embeddings[j]
            
            results.extend(batch)
        
        return results
    
    @staticmethod
    async def get_cached_embedding(text: str):
        """Check Redis for cached embedding"""
        redis_client = await get_redis()
        if redis_client is None:
            return None

        cache_key = f"embedding:{DocumentService._hash_text(text)}"
        cached = await redis_client.get(cache_key)
        if cached is None:
            return None

        return json.loads(cached)
    
    @staticmethod
    async def cache_embedding(text: str, embedding: List[float]):
        """Store embedding in Redis cache if Redis is available"""
        redis_client = await get_redis()
        if redis_client is None:
            return

        cache_key = f"embedding:{DocumentService._hash_text(text)}"
        await redis_client.setex(
            cache_key,
            settings.EMBEDDING_CACHE_TTL,
            json.dumps(embedding)
        )
    
    @staticmethod
    async def store_chunks(document_id: str, chunks: List[Dict]):
        """Store chunks in database"""
        for chunk in chunks:
            await database.execute(
                """
                INSERT INTO chunks (document_id, chunk_index, content, page_number, char_count, token_count, embedding)
                VALUES (:document_id, :chunk_index, :content, :page_number, :char_count, :token_count, :embedding::vector)
                """,
                {
                    'document_id': document_id,
                    'chunk_index': chunk['chunk_index'],
                    'content': chunk['text'],
                    'page_number': chunk['page_number'],
                    'char_count': chunk['char_count'],
                    'token_count': chunk['token_count'],
                    'embedding': chunk['embedding']
                }
            )