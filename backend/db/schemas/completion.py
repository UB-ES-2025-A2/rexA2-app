from pydantic import BaseModel
from .achievement import AchievementUnlock


class CompletionPayload(BaseModel):
  completed: bool


class CompletionStatus(BaseModel):
  completed: bool
  newly_unlocked: list[AchievementUnlock] = []
