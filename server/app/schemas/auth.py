"""Auth schemas matching frontend types."""
from pydantic import BaseModel, Field, ConfigDict


class DonorProfile(BaseModel):
    full_name: str
    phone: str
    organization: str | None = None
    aadhaar_last4: str | None = None
    aadhaar_consent: bool
    id_front_image: str | None = None
    id_back_image: str | None = None
    food_safety_cert_image: str | None = None


class VolunteerProfile(BaseModel):
    full_name: str
    phone: str
    city: str | None = None
    has_vehicle: bool = False
    aadhaar_last4: str | None = None
    aadhaar_consent: bool = False
    volunteer_id_type: str | None = None
    volunteer_id_proof_image: str | None = None


class DonorRegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    username: str
    password: str
    full_name: str = Field(..., alias="fullName")
    phone: str
    email: str | None = Field(None, alias="email")
    organization: str | None = Field(None, alias="organization")
    aadhaar_last4: str | None = Field(None, alias="aadhaarLast4")
    aadhaar_consent: bool = Field(..., alias="aadhaarConsent")
    id_front_image: str | None = Field(None, alias="idFrontImage")
    id_back_image: str | None = Field(None, alias="idBackImage")
    food_safety_cert_image: str | None = Field(None, alias="foodSafetyCertImage")  # Mandatory: health/food safety certificate


class VolunteerRegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    username: str
    password: str
    full_name: str = Field(..., alias="fullName")
    phone: str
    email: str | None = Field(None, alias="email")
    city: str | None = Field(None, alias="city")
    has_vehicle: bool = Field(False, alias="hasVehicle")
    aadhaar_last4: str | None = Field(None, alias="aadhaarLast4")
    aadhaar_consent: bool = Field(False, alias="aadhaarConsent")
    volunteer_id_type: str | None = Field(None, alias="volunteerIdType")  # DYFI_MEMBER, NSS_VOLUNTEER, NGO_COORDINATOR, etc.
    volunteer_id_proof_image: str | None = Field(None, alias="volunteerIdProofImage")  # Mandatory: proof of volunteer ID


class FcmTokenBody(BaseModel):
    """Update stored FCM token without re-login (fixes stale / unregistered tokens)."""
    token: str = Field(..., min_length=80, max_length=4096)


class LoginRequest(BaseModel):
    username: str
    password: str
    token: str | None = None  # FCM push token
    location: dict | None = None  # { "lat": float, "lng": float }


class TokenResponse(BaseModel):
    token: str
    user: dict


class RegisterResponse(BaseModel):
    """Returned when registration succeeds. If pending=True, no token (admin must approve first)."""
    user: dict
    pending: bool = False
    token: str | None = None


class UserResponse(BaseModel):
    id: str
    role: str  # DONOR | VOLUNTEER
    username: str
    createdAt: str
    donor: DonorProfile | None = None
    volunteer: VolunteerProfile | None = None
