# backend/app/api/documents.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
import uuid
import asyncio

from app.core.config import settings
from app.core.database import database
from app.services.document_service import DocumentService
from app.models.schemas import DocumentResponse, DocumentListResponse

router = APIRouter()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: Optional[str] = None
):
    """Upload and process a PDF document"""
    
    # Validate file type
    if file.content_type not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(400, "Only PDF files are allowed")
    
    # Read file
    content = await file.read()
    file_size = len(content)
    
    # Validate file size
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File size exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")
    
    # Create document record
    document_id = str(uuid.uuid4())
    
    # Extract basic info
    import PyPDF2
    import io
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
    page_count = len(pdf_reader.pages)
    
    await database.execute(
        """
        INSERT INTO documents (id, title, filename, file_size, page_count, user_id, processing_status)
        VALUES (:id, :title, :filename, :file_size, :page_count, :user_id, 'processing')
        """,
        {
            'id': document_id,
            'title': file.filename,
            'filename': file.filename,
            'file_size': file_size,
            'page_count': page_count,
            'user_id': user_id
        }
    )
    
    # Process document asynchronously
    asyncio.create_task(
        DocumentService.process_document(content, file.filename, document_id)
    )
    
    return {
        'document_id': document_id,
        'title': file.filename,
        'page_count': page_count,
        'chunk_count': 0,  # Will be updated after processing
        'status': 'processing',
        'message': 'Document uploaded successfully. Processing in background.'
    }

@router.get("/document/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str):
    """Get document metadata and status"""
    
    doc = await database.fetch_one(
        """
        SELECT d.*, COUNT(c.id) as chunk_count
        FROM documents d
        LEFT JOIN chunks c ON d.id = c.document_id
        WHERE d.id = :document_id
        GROUP BY d.id
        """,
        {'document_id': document_id}
    )
    
    if not doc:
        raise HTTPException(404, "Document not found")
    
    return {
        'document_id': str(doc['id']),
        'title': doc['title'],
        'page_count': doc['page_count'],
        'chunk_count': doc['chunk_count'] or 0,
        'status': doc['processing_status']
    }

@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(user_id: Optional[str] = None, limit: int = 50):
    """List all documents"""
    
    query = """
        SELECT d.*, COUNT(c.id) as chunk_count
        FROM documents d
        LEFT JOIN chunks c ON d.id = c.document_id
    """
    
    params = {}
    if user_id:
        query += " WHERE d.user_id = :user_id"
        params['user_id'] = user_id
    
    query += " GROUP BY d.id ORDER BY d.upload_timestamp DESC LIMIT :limit"
    params['limit'] = limit
    
    docs = await database.fetch_all(query, params)
    
    return {
        'documents': [
            {
                'document_id': str(doc['id']),
                'title': doc['title'],
                'page_count': doc['page_count'],
                'chunk_count': doc['chunk_count'] or 0,
                'status': doc['processing_status'],
                'upload_timestamp': doc['upload_timestamp'].isoformat()
            }
            for doc in docs
        ],
        'total': len(docs)
    }