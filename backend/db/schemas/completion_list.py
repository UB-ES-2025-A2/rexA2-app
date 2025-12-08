from pydantic import BaseModel


class CompletionList(BaseModel):
  route_ids: list[str]
