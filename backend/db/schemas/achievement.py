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


class AchievementUnlock(AchievementBase):
    current_value: int | None = None
    unlocked_at: datetime | None = None


class AchievementProgress(BaseModel):
    code: str
    name: str
    threshold_value: int
    current_value: int
    is_unlocked: bool
    icon: str | None = None
    rarity: str | None = None
