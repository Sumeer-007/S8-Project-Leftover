"""Feedback schemas for end-user feedback submission."""
from pydantic import BaseModel, Field, ConfigDict


class FeedbackSubmit(BaseModel):
    """Payload for submitting feedback via token link."""
    model_config = ConfigDict(populate_by_name=True)
    rating: int = Field(..., ge=1, le=5, description="1-5 stars")
    comment: str | None = Field(None, max_length=2000)
