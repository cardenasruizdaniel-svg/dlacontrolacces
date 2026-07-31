from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.facial_recognition.application.service import FacialRecognitionService
from app.modules.facial_recognition.infrastructure.repositories import FaceRepository
from app.modules.facial_recognition.presentation.schemas import (
    FaceRegisterRequest,
    FaceVerifyRequest,
    FaceVerifyResponse,
    LivenessCheckRequest,
)

router = APIRouter(prefix="/facial-recognition", tags=["Facial Recognition"])


def get_service(db: DbSession) -> FacialRecognitionService:
    return FacialRecognitionService(face_repo=FaceRepository(db))


@router.post("/register")
async def register_face(body: FaceRegisterRequest, current_user: CurrentUser, db: DbSession) -> dict:
    return await get_service(db).register_face(body.employee_id, body.photo_base64)


@router.post("/verify", response_model=FaceVerifyResponse)
async def verify_face(body: FaceVerifyRequest, db: DbSession) -> FaceVerifyResponse:
    result = await get_service(db).verify_face(body.employee_id, body.photo_base64)
    return FaceVerifyResponse(**result)


@router.post("/liveness")
async def check_liveness(body: LivenessCheckRequest, db: DbSession) -> dict:
    return await get_service(db).detect_liveness(body.photo_base64)
