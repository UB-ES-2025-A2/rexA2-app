from pydantic import BaseModel, Field


class RatingPayload(BaseModel):
    rating: float = Field(..., ge=1, le=5, description="Valoración de la ruta (1-5)")


class RatingResponse(BaseModel):
    user_rating: float
    average: float | None = None
    count: int = 0
