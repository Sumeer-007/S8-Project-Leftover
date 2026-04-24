"""Task schemas matching frontend types."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class TaskChecklist(BaseModel):
    sealed: bool = False
    labelled: bool = False
    noLeak: bool = False
    onTime: bool = False
    note: Optional[str] = None


class TaskChecklistPatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    sealed: Optional[bool] = None
    labelled: Optional[bool] = None
    noLeak: Optional[bool] = Field(None, alias="noLeak")
    onTime: Optional[bool] = Field(None, alias="onTime")
    note: Optional[str] = None


class AcceptPickupRequest(BaseModel):
    """Volunteer info for accepting pickup. Accepts id/name/phoneMasked or volunteerId/volunteerName/volunteerPhoneMasked."""
    model_config = ConfigDict(populate_by_name=True)
    volunteerId: str | None = Field(None, alias="volunteerId")
    volunteerName: str | None = Field(None, alias="volunteerName")
    volunteerPhoneMasked: str | None = Field(None, alias="volunteerPhoneMasked")
    id: str | None = None
    name: str | None = None
    phoneMasked: str | None = Field(None, alias="phoneMasked")


class EndUserCreate(BaseModel):
    """End user (recipient) details when volunteer marks delivery."""
    model_config = ConfigDict(populate_by_name=True)
    name: str
    age: Optional[int] = Field(None, ge=0, le=150)
    address: str
    email: Optional[str] = None
    phone: Optional[str] = None


class DeliverRequest(BaseModel):
    """Request body for marking task as delivered with end-user details."""
    model_config = ConfigDict(populate_by_name=True)
    endUser: EndUserCreate = Field(..., alias="endUser")


class TaskResponse(BaseModel):
    id: str
    donationId: str
    volunteerId: str
    step: str
    checklist: TaskChecklist
    updatedAt: str
