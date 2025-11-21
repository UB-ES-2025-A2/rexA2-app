from pydantic import BaseModel
from typing import List, Optional

class FollowActionResponse(BaseModel):
    ok: bool = True

class UserLite(BaseModel):
    id: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None

class FollowersList(BaseModel):
    total: int
    items: List[UserLite]
