import json
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.database import database
from app.models.schemas import ConversationListResponse, ConversationResponse

router = APIRouter()


def _normalize_citations(value):
    if value is None:
        return []
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return []
    return value


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    user_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
):
    """List conversations, newest first."""
    query = """
        SELECT id, title, created_at, updated_at
        FROM conversations
    """
    params = {"limit": limit}

    if user_id:
        query += " WHERE user_id = :user_id"
        params["user_id"] = user_id

    query += " ORDER BY updated_at DESC LIMIT :limit"
    conversations = await database.fetch_all(query, params)

    return {
        "conversations": [
            {
                "id": str(conversation["id"]),
                "title": conversation["title"],
                "created_at": conversation["created_at"].isoformat(),
                "updated_at": conversation["updated_at"].isoformat(),
            }
            for conversation in conversations
        ],
        "total": len(conversations),
    }


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
@router.get("/conversation/{conversation_id}", response_model=ConversationResponse, include_in_schema=False)
async def get_conversation(conversation_id: uuid.UUID):
    """Get full conversation history."""
    conv = await database.fetch_one(
        "SELECT * FROM conversations WHERE id = :id",
        {"id": str(conversation_id)},
    )

    if not conv:
        raise HTTPException(404, "Conversation not found")

    messages = await database.fetch_all(
        """
        SELECT id, role, content, citations, created_at
        FROM messages
        WHERE conversation_id = :conv_id
        ORDER BY created_at
        """,
        {"conv_id": str(conversation_id)},
    )

    return {
        "id": str(conv["id"]),
        "title": conv["title"],
        "created_at": conv["created_at"].isoformat(),
        "messages": [
            {
                "id": str(msg["id"]),
                "role": msg["role"],
                "content": msg["content"],
                "citations": _normalize_citations(msg["citations"]),
                "created_at": msg["created_at"].isoformat(),
            }
            for msg in messages
        ],
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: uuid.UUID):
    """Delete a conversation and its messages."""
    deleted_id = await database.fetch_val(
        "DELETE FROM conversations WHERE id = :id RETURNING id",
        {"id": str(conversation_id)},
    )
    if deleted_id is None:
        raise HTTPException(404, "Conversation not found")

    return {"conversation_id": str(deleted_id), "status": "deleted"}
