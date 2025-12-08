# backend/app/services/query_service.py
from typing import List, Dict, Optional
import hashlib
import json
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.database import database
from app.core.redis import redis_client
from app.services.document_service import DocumentService

# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class QueryService:
    @staticmethod
    async def answer_query(
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 5,
        conversation_history: Optional[List[Dict]] = None
        ) -> Dict:
        """Main RAG pipeline"""
        
        # Check cache
        cached_answer = await QueryService.get_cached_answer(query, document_ids)
        if cached_answer:
            return {**cached_answer, 'cache_hit': True}
        
        # Generate query embedding
        query_embedding = await QueryService.generate_query_embedding(query)
        
        # Semantic search
        retrieved_chunks = await QueryService.semantic_search(
            query_embedding,
            document_ids,
            top_k
        )
        
        if not retrieved_chunks:
            return {
                'answer': "I couldn't find any relevant information in the documents to answer your question.",
                'citations': [],
                'has_answer': False,
                'cache_hit': False
            }
        
        # Generate answer with LLM
        answer = await QueryService.generate_answer(
            query,
            retrieved_chunks,
            conversation_history
        )
        
        # Cache answer
        await QueryService.cache_answer(query, document_ids, answer)
        
        return {**answer, 'cache_hit': False}
    
    @staticmethod
    async def generate_query_embedding(query: str) -> List[float]:
        """Generate embedding for query"""
        cached = await DocumentService.get_cached_embedding(query)
        if cached:
            return cached
        
        response = await client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=query
        )
        
        embedding = response.data[0].embedding
        await DocumentService.cache_embedding(query, embedding)
        
        return embedding
    
    @staticmethod
    async def semantic_search(
        query_embedding: List[float],
        document_ids: Optional[List[str]],
        top_k: int
        ) -> List[Dict]:
        """Search for similar chunks"""
        
        sql = """
            SELECT 
                c.id,
                c.content,
                c.page_number,
                d.title as document_title,
                d.id as document_id,
                1 - (c.embedding <=> $1::vector) as similarity
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE d.processing_status = 'completed'
        """
        
        params = [query_embedding]
        
        if document_ids:
            sql += " AND d.id = ANY($2::uuid[])"
            params.append(document_ids)
        
        sql += f" ORDER BY c.embedding <=> $1::vector LIMIT ${len(params) + 1}"
        params.append(top_k * 2)
        
        results = await database.fetch_all(sql, params)
        
        # Filter by threshold
        filtered = [
            {
                'chunk_id': str(row['id']),
                'content': row['content'],
                'page_number': row['page_number'],
                'document_title': row['document_title'],
                'document_id': str(row['document_id']),
                'similarity': float(row['similarity'])
            }
            for row in results
            if row['similarity'] >= settings.SIMILARITY_THRESHOLD
        ]
        
        return filtered[:top_k]
    
    @staticmethod
    async def generate_answer(
        query: str,
        chunks: List[Dict],
        conversation_history: Optional[List[Dict]]
        ) -> Dict:
        """Generate answer using GPT-4"""
        
        context = QueryService.build_context(chunks)
        system_prompt = QueryService.get_system_prompt()
        user_prompt = QueryService.build_user_prompt(query, context, conversation_history)
        
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            max_tokens=800,
            response_format={"type": "json_object"}
        )
        
        answer_json = json.loads(response.choices[0].message.content)
        
        citations = QueryService.map_citations(
            answer_json.get('citations', []),
            chunks
        )
        
        return {
            'answer': answer_json['answer'],
            'citations': citations,
            'has_answer': answer_json.get('has_answer', True)
        }
    
    @staticmethod
    def build_context(chunks: List[Dict]) -> str:
        """Format chunks for LLM"""
        parts = []
        for i, chunk in enumerate(chunks):
            parts.append(f"""[SOURCE {i+1}]
            Document: {chunk['document_title']}
            Page: {chunk['page_number']}
            Content: {chunk['content']}
            ---""")
        return "\n\n".join(parts)
    
    @staticmethod
    def get_system_prompt() -> str:
        return """You are an expert document analysis assistant. Answer questions based ONLY on the provided context.
                Rules:
                1. Only use information explicitly stated in the context
                2. Cite sources using [SOURCE X] notation
                3. If context lacks info, say: "I don't have enough information in the provided documents to answer this question."
                4. Respond in JSON: {"answer": "...", "has_answer": true/false, "citations": [1, 2]}
                5. Be comprehensive when information is available"""
    
    @staticmethod
    def build_user_prompt(query: str, context: str, history: Optional[List[Dict]]) -> str:
        parts = []
        
        if history:
            parts.append("Previous conversation:")
            for msg in history[-3:]:
                parts.append(f"{msg['role']}: {msg['content']}")
            parts.append("\n---\n")
        parts.append(f"""Context:
                    {context}
                    Question: {query}
                    Provide a JSON response with answer, has_answer (boolean), and citations (array of source numbers).""")
        return "\n".join(parts)
    
    @staticmethod
    def map_citations(indices: List[int], chunks: List[Dict]) -> List[Dict]:
        """Map citation numbers to chunk metadata"""
        citations = []
        for idx in indices:
            if 0 < idx <= len(chunks):
                chunk = chunks[idx - 1]
                citations.append({
                    'chunk_id': chunk['chunk_id'],
                    'document_title': chunk['document_title'],
                    'page_number': chunk['page_number'],
                    'text_preview': chunk['content'][:200] + "...",
                    'similarity_score': chunk['similarity']
                })
        return citations
    
    @staticmethod
    async def get_cached_answer(query: str, document_ids: Optional[List[str]]) -> Optional[Dict]:
        """Check cache for previous answer"""
        cache_key = QueryService.build_cache_key(query, document_ids)
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
        return None
    
    @staticmethod
    async def cache_answer(query: str, document_ids: Optional[List[str]], answer: Dict):
        """Cache answer"""
        cache_key = QueryService.build_cache_key(query, document_ids)
        await redis_client.setex(
            cache_key,
            settings.QUERY_CACHE_TTL,
            json.dumps(answer)
        )
    
    @staticmethod
    def build_cache_key(query: str, document_ids: Optional[List[str]]) -> str:
        """Generate cache key"""
        doc_str = ",".join(sorted(document_ids)) if document_ids else "all"
        content = f"{query}::{doc_str}"
        hash_key = hashlib.sha256(content.encode()).hexdigest()
        return f"query_cache:{hash_key}"