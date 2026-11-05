import os
import uuid
import logging
from typing import Dict, Any, List, Optional
import boto3
from botocore.exceptions import ClientError, NoCredentialsError, BotoCoreError
from fastapi import UploadFile, HTTPException
from app.config import settings

logger = logging.getLogger("safecheck.image_moderation")

# Allowed image MIME types and extensions
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Rekognition category severity weighting for deterministic risk score calculation
# High-severity categories (Multiplier 1.0): Rekognition confidence translates directly to risk score.
# Moderate-severity categories (Multiplier 0.65): Mild suggestive/regulatory content produces Flagged scores.
HIGH_SEVERITY_CATEGORIES = {
    "explicit nudity", "violence", "visually disturbing", "hate symbols",
    "graphic violence or gore", "terrorism", "self-harm", "sexual activity",
    "non-consensual sexual content"
}

MODERATE_SEVERITY_CATEGORIES = {
    "suggestive", "revealing clothes", "sexual situations", "tobacco",
    "alcohol", "gambling", "weapons", "drugs", "rudeness",
    "accident & damage", "vehicular crash", "property damage"
}


def validate_image_file(file: UploadFile, file_bytes: bytes) -> None:
    """Validate file extension, mime type, and file size."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    # Check extension
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP."
        )

    # Check content type if provided
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported MIME type '{file.content_type}'. Allowed: image/jpeg, image/png, image/webp."
        )

    # Check size
    if len(file_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
        max_mb = settings.MAX_IMAGE_SIZE_BYTES / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Image size exceeds the maximum limit of {max_mb:.0f} MB."
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")


def get_s3_client():
    """Initializes and returns an S3 client using configured credentials or environment."""
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
    return boto3.client("s3", region_name=settings.AWS_REGION)


def get_rekognition_client():
    """Initializes and returns a Rekognition client."""
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "rekognition",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
    return boto3.client("rekognition", region_name=settings.AWS_REGION)


# Type alias helper
ScoreResultTuple = tuple[float, str, float, List[str], List[Dict[str, Any]]]


def calculate_image_risk_score(moderation_labels: List[Dict[str, Any]]) -> ScoreResultTuple:
    """
    Computes a deterministic risk score from 0 to 100 based on Rekognition moderation labels.
    - Risk score < 30: Safe
    - Risk score 30 to 69: Flagged
    - Risk score >= 70: Blocked
    """
    if not moderation_labels:
        return 0.0, "Safe", 98.0, [], []

    highest_score = 0.0
    detected_categories = []
    formatted_labels = []

    for label in moderation_labels:
        name = label.get("Name", "")
        parent_name = label.get("ParentName", "")
        confidence = float(label.get("Confidence", 0.0))

        label_item = {
            "name": name,
            "parent_name": parent_name,
            "confidence": round(confidence, 1)
        }
        formatted_labels.append(label_item)

        category_name = parent_name if parent_name else name
        if category_name not in detected_categories:
            detected_categories.append(category_name)

        # Check severity multiplier
        name_lower = name.lower()
        parent_lower = parent_name.lower() if parent_name else ""

        is_high = (
            any(high in name_lower for high in HIGH_SEVERITY_CATEGORIES) or
            any(high in parent_lower for high in HIGH_SEVERITY_CATEGORIES)
        )
        is_moderate = (
            any(mod in name_lower for mod in MODERATE_SEVERITY_CATEGORIES) or
            any(mod in parent_lower for mod in MODERATE_SEVERITY_CATEGORIES)
        )

        if is_high:
            multiplier = 1.0
        elif is_moderate:
            multiplier = 0.65
        else:
            multiplier = 0.50

        weighted_score = confidence * multiplier
        if weighted_score > highest_score:
            highest_score = weighted_score

    # Add small compound factor for multiple violations
    additional = min((len(moderation_labels) - 1) * 3.0, 15.0) if len(moderation_labels) > 1 else 0.0
    final_score = min(highest_score + additional, 100.0)

    # Average confidence of detected labels
    avg_confidence = sum(l["confidence"] for l in formatted_labels) / len(formatted_labels)

    # Map to Status according to rules
    if final_score < settings.THRESHOLD_FLAGGED:
        status = "Safe"
    elif final_score < settings.THRESHOLD_BLOCKED:
        status = "Flagged"
    else:
        status = "Blocked"

    return round(final_score, 1), status, round(avg_confidence, 1), detected_categories, formatted_labels



def moderate_image_bytes(
    file_bytes: bytes,
    original_filename: str,
    content_type: str
) -> Dict[str, Any]:
    """
    Uploads an image to Amazon S3, performs Rekognition DetectModerationLabels,
    and returns moderation results.

    If AWS credentials are not configured or MOCK_AWS is enabled,
    gracefully simulates analysis for smooth local development.
    """
    has_aws_keys = bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.AWS_S3_BUCKET)

    if settings.MOCK_AWS or not has_aws_keys:
        logger.warning("AWS S3/Rekognition credentials not configured or MOCK_AWS enabled. Running simulated image moderation.")
        return simulate_mock_image_moderation(file_bytes, original_filename, content_type)

    # Generate unique key for private S3 storage
    _, ext = os.path.splitext(original_filename.lower())
    unique_id = str(uuid.uuid4())
    s3_key = f"uploads/{unique_id}{ext}"

    try:
        s3 = get_s3_client()
        bucket = settings.AWS_S3_BUCKET

        # 1. Upload to Private S3 Bucket
        s3.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type,
            Metadata={"original-filename": original_filename}
        )

        # 2. Generate secure presigned URL for previewing in UI (expires in 1 hour)
        preview_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": s3_key},
            ExpiresIn=3600
        )

        # 3. Call Amazon Rekognition DetectModerationLabels
        rekognition = get_rekognition_client()
        rekognition_response = rekognition.detect_moderation_labels(
            Image={
                "S3Object": {
                    "Bucket": bucket,
                    "Name": s3_key
                }
            },
            MinConfidence=50.0
        )

        raw_labels = rekognition_response.get("ModerationLabels", [])

        # 4. Calculate Risk Score and Status
        risk_score, status, confidence, categories, formatted_labels = calculate_image_risk_score(raw_labels)

        return {
            "content": f"s3://{bucket}/{s3_key}",
            "preview_url": preview_url,
            "risk_score": risk_score,
            "status": status,
            "confidence_score": confidence,
            "categories": categories,
            "details": {
                "s3_bucket": bucket,
                "s3_key": s3_key,
                "original_filename": original_filename,
                "file_size_bytes": len(file_bytes),
                "moderation_labels": formatted_labels,
                "summary": (
                    f"Amazon Rekognition analyzed the image. Detected {len(formatted_labels)} "
                    f"moderation label(s). Risk score: {risk_score}/100 ({status})."
                )
            }
        }

    except (NoCredentialsError, ClientError, BotoCoreError) as aws_err:
        logger.error(f"AWS Error during image moderation: {str(aws_err)}")
        raise HTTPException(
            status_code=502,
            detail=f"AWS Rekognition/S3 error: {str(aws_err)}. Please verify your AWS IAM permissions and bucket name."
        )
    except Exception as e:
        logger.error(f"Unexpected error in image moderation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")


def simulate_mock_image_moderation(
    file_bytes: bytes,
    original_filename: str,
    content_type: str
) -> Dict[str, Any]:
    """
    Simulation mode when AWS credentials are not yet configured.
    Provides immediate educational feedback without breaking the local UI flow.
    """
    # Deterministic check based on filename keywords for testing purposes
    fn = original_filename.lower()
    mock_labels = []

    if "explicit" in fn or "violence" in fn or "hate" in fn:
        mock_labels = [
            {"Name": "Explicit Nudity", "ParentName": "Explicit Content", "Confidence": 88.5},
            {"Name": "Graphic Violence", "ParentName": "Violence", "Confidence": 79.2}
        ]
    elif "crash" in fn or "accident" in fn or "damage" in fn:
        mock_labels = [
            {"Name": "Vehicular Crash Scene", "ParentName": "Accident & Damage", "Confidence": 78.0},
            {"Name": "Property Damage", "ParentName": "Accident & Damage", "Confidence": 66.0}
        ]
    elif "flagged" in fn or "weapons" in fn or "suggestive" in fn or "drink" in fn:
        mock_labels = [
            {"Name": "Suggestive Attire", "ParentName": "Suggestive", "Confidence": 74.0},
            {"Name": "Alcoholic Beverages", "ParentName": "Alcohol", "Confidence": 65.5}
        ]

    risk_score, status, confidence, categories, formatted_labels = calculate_image_risk_score(mock_labels)

    # Base64 data URL for local preview when S3 is in simulation mode
    import base64
    b64_data = base64.b64encode(file_bytes).decode("utf-8")
    preview_url = f"data:{content_type};base64,{b64_data}"

    return {
        "content": f"[Simulated Storage] {original_filename}",
        "preview_url": preview_url,
        "risk_score": risk_score,
        "status": status,
        "confidence_score": confidence,
        "categories": categories,
        "details": {
            "simulation_mode": True,
            "original_filename": original_filename,
            "file_size_bytes": len(file_bytes),
            "moderation_labels": formatted_labels,
            "notice": "Simulated local mode. Provide AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET in backend/.env for live Amazon Rekognition.",
            "summary": (
                f"Simulated analysis: {len(formatted_labels)} label(s) identified. "
                f"Risk score: {risk_score}/100 ({status})."
            )
        }
    }
