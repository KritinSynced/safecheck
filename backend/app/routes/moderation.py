import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import ModerationRecord
from app.schemas import (
    TextModerationRequest,
    ModerationResultResponse,
    DecisionUpdateRequest,
    HistoryResponse,
    HistoryStats
)
from app.services.text_moderation import moderate_text
from app.services.image_moderation import validate_image_file, moderate_image_bytes

router = APIRouter(prefix="/api", tags=["moderation"])


def record_to_response(rec: ModerationRecord) -> ModerationResultResponse:
    """Helper to convert a DB record into ModerationResultResponse."""
    categories_list = []
    try:
        categories_list = json.loads(rec.categories_json) if rec.categories_json else []
    except Exception:
        categories_list = []

    details_dict = {}
    try:
        details_dict = json.loads(rec.details_json) if rec.details_json else {}
    except Exception:
        details_dict = {}

    return ModerationResultResponse(
        id=rec.id,
        content_type=rec.content_type,
        content=rec.content,
        preview_url=rec.preview_url,
        risk_score=rec.risk_score,
        status=rec.status,
        confidence_score=rec.confidence_score,
        categories=categories_list,
        details=details_dict,
        moderator_decision=rec.moderator_decision,
        created_at=rec.created_at
    )


@router.post("/moderate/text", response_model=ModerationResultResponse)
def moderate_text_endpoint(
    payload: TextModerationRequest,
    db: Session = Depends(get_db)
):
    """
    Submits text content for automated moderation.
    Detects harmful words, offensive phrases, and spam patterns.
    Computes a deterministic risk score (0-100) and saves the audit record.
    """
    cleaned_text = payload.text.strip()
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="Text cannot be blank.")

    # Execute text moderation service
    mod_result = moderate_text(cleaned_text)

    # Save to SQLite
    record = ModerationRecord(
        content_type="text",
        content=cleaned_text,
        preview_url=None,
        risk_score=mod_result["risk_score"],
        status=mod_result["status"],
        confidence_score=mod_result["confidence_score"],
        categories_json=json.dumps(mod_result["categories"]),
        details_json=json.dumps(mod_result["details"]),
        moderator_decision=None
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record_to_response(record)


@router.post("/moderate/image", response_model=ModerationResultResponse)
async def moderate_image_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Submits an image for automated moderation.
    Validates file format and size, uploads image to Amazon S3,
    and analyzes it with Amazon Rekognition DetectModerationLabels.
    Computes deterministic risk score and saves the audit record.
    """
    # Read file bytes
    file_bytes = await file.read()

    # Validate file size and type
    validate_image_file(file, file_bytes)

    # Moderate via AWS Rekognition (or mock if no AWS keys)
    mod_result = moderate_image_bytes(
        file_bytes=file_bytes,
        original_filename=file.filename or "uploaded_image",
        content_type=file.content_type or "image/jpeg"
    )

    # Save to SQLite
    record = ModerationRecord(
        content_type="image",
        content=mod_result["content"],
        preview_url=mod_result.get("preview_url"),
        risk_score=mod_result["risk_score"],
        status=mod_result["status"],
        confidence_score=mod_result["confidence_score"],
        categories_json=json.dumps(mod_result["categories"]),
        details_json=json.dumps(mod_result["details"]),
        moderator_decision=None
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record_to_response(record)


@router.get("/moderation/history", response_model=HistoryResponse)
def get_moderation_history(
    status: Optional[str] = Query(None, description="Filter by status: Safe, Flagged, Blocked"),
    content_type: Optional[str] = Query(None, description="Filter by content_type: text, image"),
    limit: int = Query(50, ge=1, le=200, description="Number of records to fetch"),
    db: Session = Depends(get_db)
):
    """
    Fetches moderation history table records and aggregate statistics.
    Sorted by newest submissions first.
    """
    # 1. Base query for stats
    all_records = db.query(ModerationRecord).all()
    stats = HistoryStats(
        total=len(all_records),
        safe_count=sum(1 for r in all_records if r.status == "Safe"),
        flagged_count=sum(1 for r in all_records if r.status == "Flagged"),
        blocked_count=sum(1 for r in all_records if r.status == "Blocked"),
        approved_count=sum(1 for r in all_records if r.moderator_decision == "approved"),
        rejected_count=sum(1 for r in all_records if r.moderator_decision == "rejected")
    )

    # 2. Filter query for listing
    query = db.query(ModerationRecord)
    if status:
        query = query.filter(ModerationRecord.status == status.capitalize())
    if content_type:
        query = query.filter(ModerationRecord.content_type == content_type.lower())

    records = query.order_by(desc(ModerationRecord.created_at)).limit(limit).all()

    items = [record_to_response(rec) for rec in records]
    return HistoryResponse(items=items, stats=stats)


@router.patch("/moderation/{record_id}/decision", response_model=ModerationResultResponse)
def update_moderator_decision(
    record_id: int,
    payload: DecisionUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Allows a human moderator to approve or reject flagged/blocked content.
    Demonstrates human-in-the-loop review workflow.
    """
    record = db.query(ModerationRecord).filter(ModerationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Moderation record with ID {record_id} not found.")

    record.moderator_decision = payload.decision
    db.commit()
    db.refresh(record)

    return record_to_response(record)

