import io
import uuid
from pathlib import Path
from typing import Optional

import PyPDF2
from PyPDF2.errors import PdfReadError
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile

from app.core.config import settings
from app.core.database import database
from app.models.schemas import DocumentListResponse, DocumentResponse
from app.services.document_service import DocumentService

router = APIRouter()


def _document_payload(doc) -> dict:
    return {
        "document_id": str(doc["id"]),
        "title": doc["title"],
        "page_count": doc["page_count"],
        "chunk_count": doc["chunk_count"] or 0,
        "status": doc["processing_status"],
        "upload_timestamp": doc["upload_timestamp"].isoformat() if doc["upload_timestamp"] else None,
    }


def _read_pdf_page_count(content: bytes) -> int:
    if not content.startswith(b"%PDF-"):
        raise HTTPException(400, "The uploaded file is not a valid PDF")

    try:
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            decrypt_result = reader.decrypt("")
            if decrypt_result == 0:
                raise HTTPException(400, "Encrypted PDFs are not supported")
        return len(reader.pages)
    except HTTPException:
        raise
    except (PdfReadError, ValueError, OSError) as exc:
        raise HTTPException(400, "The uploaded file is not a readable PDF") from exc


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: Optional[str] = None,
):
    """Upload and process a PDF document."""
    if file.content_type not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(400, "Only PDF files are allowed")

    content = await file.read()
    file_size = len(content)
    if file_size == 0:
        raise HTTPException(400, "Uploaded file is empty")

    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File size exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

    page_count = _read_pdf_page_count(content)
    if page_count == 0:
        raise HTTPException(400, "PDF has no pages")

    document_id = str(uuid.uuid4())
    filename = Path(file.filename or "document.pdf").name

    await database.execute(
        """
        INSERT INTO documents (id, title, filename, file_size, page_count, user_id, processing_status)
        VALUES (:id, :title, :filename, :file_size, :page_count, :user_id, 'processing')
        """,
        {
            "id": document_id,
            "title": filename,
            "filename": filename,
            "file_size": file_size,
            "page_count": page_count,
            "user_id": user_id,
        },
    )

    background_tasks.add_task(DocumentService.process_document, content, filename, document_id)

    return {
        "document_id": document_id,
        "title": filename,
        "page_count": page_count,
        "chunk_count": 0,
        "status": "processing",
        "message": "Document uploaded successfully. Processing in background.",
    }


@router.get("/documents/{document_id}", response_model=DocumentResponse)
@router.get("/document/{document_id}", response_model=DocumentResponse, include_in_schema=False)
async def get_document(document_id: uuid.UUID):
    """Get document metadata and processing status."""
    doc = await database.fetch_one(
        """
        SELECT d.*, COUNT(c.id) AS chunk_count
        FROM documents d
        LEFT JOIN chunks c ON d.id = c.document_id
        WHERE d.id = :document_id
        GROUP BY d.id
        """,
        {"document_id": str(document_id)},
    )

    if not doc:
        raise HTTPException(404, "Document not found")

    return _document_payload(doc)


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    user_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
):
    """List uploaded documents."""
    query = """
        SELECT d.*, COUNT(c.id) AS chunk_count
        FROM documents d
        LEFT JOIN chunks c ON d.id = c.document_id
    """

    params = {}
    if user_id:
        query += " WHERE d.user_id = :user_id"
        params["user_id"] = user_id

    query += " GROUP BY d.id ORDER BY d.upload_timestamp DESC LIMIT :limit"
    params["limit"] = limit

    docs = await database.fetch_all(query, params)
    return {
        "documents": [_document_payload(doc) for doc in docs],
        "total": len(docs),
    }


@router.delete("/documents/{document_id}")
async def delete_document(document_id: uuid.UUID):
    """Delete a document and its chunks."""
    deleted_id = await database.fetch_val(
        "DELETE FROM documents WHERE id = :document_id RETURNING id",
        {"document_id": str(document_id)},
    )
    if deleted_id is None:
        raise HTTPException(404, "Document not found")

    return {"document_id": str(deleted_id), "status": "deleted"}
