import json
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from app.database import Base


class ModerationRecord(Base):
    __tablename__ = "moderation_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    content_type = Column(String(20), nullable=False)  # "text" or "image"
    content = Column(Text, nullable=False)  # Raw text or image filename/key
    preview_url = Column(Text, nullable=True)  # S3 presigned URL or data preview
    risk_score = Column(Float, nullable=False, default=0.0)  # 0 to 100
    status = Column(String(20), nullable=False)  # "Safe", "Flagged", "Blocked"
    confidence_score = Column(Float, nullable=False, default=0.0)  # 0 to 100
    categories_json = Column(Text, nullable=False, default="[]")  # JSON list of categories
    details_json = Column(Text, nullable=False, default="{}")  # JSON dict with extra details
    moderator_decision = Column(String(20), nullable=True)  # "approved", "rejected", or None
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    @property
    def categories(self):
        try:
            return json.loads(self.categories_json)
        except Exception:
            return []

    @categories.setter
    def categories(self, value):
        self.categories_json = json.dumps(value)

    @property
    def details(self):
        try:
            return json.loads(self.details_json)
        except Exception:
            return {}

    @details.setter
    def details(self, value):
        self.details_json = json.dumps(value)

