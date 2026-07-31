from pydantic import BaseModel


class FaceRegisterRequest(BaseModel):
    employee_id: str
    photo_base64: str


class FaceVerifyRequest(BaseModel):
    employee_id: str
    photo_base64: str


class LivenessCheckRequest(BaseModel):
    photo_base64: str


class FaceVerifyResponse(BaseModel):
    verified: bool
    score: float
    message: str
