# backend/app/models/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List

class DocumentResponse(BaseModel):
    document_id: str
    title: str
    page_count: int
    chunk_count: int
    status: str
    message: Optional[str] = None

class DocumentListResponse(BaseModel):
    documents: List[dict]
    total: int

class Citation(BaseModel):
    chunk_id: str
    document_title: str
    page_number: int
    text_preview: str
    similarity_score: float

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    conversation_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    top_k: Optional[int] = 5
    user_id: Optional[str] = None

class QueryResponse(BaseModel):
    conversation_id: str
    message_id: str
    answer: str
    citations: List[Citation]
    retrieved_chunks: int
    cache_hit: bool
    processing_time_ms: int

class Message(BaseModel):
    id: str
    role: str
    content: str
    citations: Optional[List[Citation]] = None
    created_at: str

class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: str
    messages: List[Message]