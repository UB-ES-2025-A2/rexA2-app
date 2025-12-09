from datetime import datetime
from pydantic import BaseModel, Field


class AchievementBase(BaseModel):
    code: str
    name: str
    description: str
    category: str
    threshold_value: int = Field(..., ge=0)
    icon: str | None = None
    rarity: str | None = None
    theme_id: str | None = None


class AchievementUnlock(AchievementBase):
    current_value: float | None = None
    unlocked_at: datetime | None = None


class AchievementProgress(BaseModel):
    code: str
    name: str
    threshold_value: int
    current_value: float
    is_unlocked: bool
    icon: str | None = None
    rarity: str | None = None
    theme_id: str | None = None
