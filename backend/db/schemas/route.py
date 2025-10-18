from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class Point(BaseModel):
    latitude: float
    longitude: float

class RouteBase(BaseModel):
    name: str
    points: List[Point]
    visibility: bool = False
    category: str | None = None

class RouteCreate(RouteBase):
    pass

class RoutePublic(RouteBase):
    id: str = Field(alias="_id")
    owner_id: str
    created_at: datetime