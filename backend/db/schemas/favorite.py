from pydantic import BaseModel
from typing import List

class FavoriteListOut(BaseModel):
    route_ids: List[str]
