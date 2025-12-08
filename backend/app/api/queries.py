# backend/app/api/queries.py
from fastapi import APIRouter, HTTPException
from typing import Optional, List
import time
import uuid

from app.core.database import database
from app.services.query_service import QueryService
from app.models.schemas import QueryRequest, QueryResponse

router = APIRouter()

@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """Ask a question about documents"""
    
    start_time = time.time()
    
    # Get conversation history if conversation_id provided
    conversation_history = None
    if request.conversation_id:
        messages = await database.fetch_all(
            """
            SELECT role, content
            FROM messages
            WHERE conversation_id = :conv_id
            ORDER BY created_at
            LIMIT 10
            """,
            {'conv_id': request.conversation_id}
        )
        conversation_history = [
            {'role': msg['role'], 'content': msg['content']}
            for msg in messages
        ]
    
    # Generate answer
    result = await QueryService.answer_query(
        query=request.query,
        document_ids=request.document_ids,
        top_k=request.top_k or 5,
        conversation_history=conversation_history
    )
    
    # Create or get conversation
    if not request.conversation_id:
        conversation_id = str(uuid.uuid4())
        await database.execute(
            """
            INSERT INTO conversations (id, user_id, title)
            VALUES (:id, :user_id, :title)
            """,
            {
                'id': conversation_id,
                'user_id': request.user_id,
                'title': request.query[:100]  # Use first 100 chars of query as title
            }
        )
    else:
        conversation_id = request.conversation_id
        # Update conversation timestamp
        await database.execute(
            "UPDATE conversations SET updated_at = NOW() WHERE id = :id",
            {'id': conversation_id}
        )
    
    # Store messages
    user_msg_id = str(uuid.uuid4())
    await database.execute(
        """
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (:id, :conv_id, 'user', :content)
        """,
        {'id': user_msg_id, 'conv_id': conversation_id, 'content': request.query}
    )
    
    assistant_msg_id = str(uuid.uuid4())
    await database.execute(
        """
        INSERT INTO messages (id, conversation_id, role, content, citations)
        VALUES (:id, :conv_id, 'assistant', :content, :citations)
        """,
        {
            'id': assistant_msg_id,
            'conv_id': conversation_id,
            'content': result['answer'],
            'citations': result['citations']
        }
    )
    
    processing_time = int((time.time() - start_time) * 1000)
    
    return {
        'conversation_id': conversation_id,
        'message_id': assistant_msg_id,
        'answer': result['answer'],
        'citations': result['citations'],
        'retrieved_chunks': len(result['citations']),
        'cache_hit': result['cache_hit'],
        'processing_time_ms': processing_time
    }