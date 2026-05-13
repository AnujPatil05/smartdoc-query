import json
import time
import uuid

from fastapi import APIRouter, HTTPException

from app.core.database import database
from app.models.schemas import QueryRequest, QueryResponse
from app.services.query_service import QueryService

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """Ask a question about uploaded documents."""
    start_time = time.time()
    conversation_history = None
    conversation_id = str(request.conversation_id) if request.conversation_id else None

    if conversation_id:
        conversation = await database.fetch_one(
            "SELECT id FROM conversations WHERE id = :id",
            {"id": conversation_id},
        )
        if not conversation:
            raise HTTPException(404, "Conversation not found")

        messages = await database.fetch_all(
            """
            SELECT role, content
            FROM messages
            WHERE conversation_id = :conv_id
            ORDER BY created_at DESC
            LIMIT 10
            """,
            {"conv_id": conversation_id},
        )
        conversation_history = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in reversed(messages)
        ]

    document_ids = [str(document_id) for document_id in request.document_ids] if request.document_ids else None
    result = await QueryService.answer_query(
        query=request.query,
        document_ids=document_ids,
        top_k=request.top_k,
        conversation_history=conversation_history,
    )

    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        await database.execute(
            """
            INSERT INTO conversations (id, user_id, title)
            VALUES (:id, :user_id, :title)
            """,
            {
                "id": conversation_id,
                "user_id": request.user_id,
                "title": request.query[:100],
            },
        )
    else:
        await database.execute(
            "UPDATE conversations SET updated_at = NOW() WHERE id = :id",
            {"id": conversation_id},
        )

    user_msg_id = str(uuid.uuid4())
    await database.execute(
        """
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (:id, :conv_id, 'user', :content)
        """,
        {"id": user_msg_id, "conv_id": conversation_id, "content": request.query},
    )

    assistant_msg_id = str(uuid.uuid4())
    await database.execute(
        """
        INSERT INTO messages (id, conversation_id, role, content, citations)
        VALUES (:id, :conv_id, 'assistant', :content, CAST(:citations AS jsonb))
        """,
        {
            "id": assistant_msg_id,
            "conv_id": conversation_id,
            "content": result["answer"],
            "citations": json.dumps(result["citations"]),
        },
    )

    processing_time = int((time.time() - start_time) * 1000)

    return {
        "conversation_id": conversation_id,
        "message_id": assistant_msg_id,
        "answer": result["answer"],
        "citations": result["citations"],
        "retrieved_chunks": len(result["citations"]),
        "cache_hit": result["cache_hit"],
        "processing_time_ms": processing_time,
    }
