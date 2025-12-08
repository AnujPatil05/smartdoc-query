# backend/app/api/conversations.py
from fastapi import APIRouter, HTTPException

from app.core.database import database
from app.models.schemas import ConversationResponse

router = APIRouter()

@router.get("/conversation/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str):
    """Get full conversation history"""
    
    conv = await database.fetch_one(
        "SELECT * FROM conversations WHERE id = :id",
        {'id': conversation_id}
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
        {'conv_id': conversation_id}
    )
    
    return {
        'id': str(conv['id']),
        'title': conv['title'],
        'created_at': conv['created_at'].isoformat(),
        'messages': [
            {
                'id': str(msg['id']),
                'role': msg['role'],
                'content': msg['content'],
                'citations': msg['citations'],
                'created_at': msg['created_at'].isoformat()
            }
            for msg in messages
        ]
    }