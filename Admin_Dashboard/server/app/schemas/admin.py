from pydantic import BaseModel


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminTokenResponse(BaseModel):
    token: str
    admin: dict


class AdminRegisterRequest(BaseModel):
    username: str
    password: str
