from pydantic import BaseModel

class ConfigItem(BaseModel):
    key: str
    value: str | None = None
    description: str | None = None

    class Config:
        from_attributes = True
