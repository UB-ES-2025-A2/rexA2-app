from pydantic import BaseModel


class CompletionPayload(BaseModel):
  completed: bool


class CompletionStatus(BaseModel):
  completed: bool
