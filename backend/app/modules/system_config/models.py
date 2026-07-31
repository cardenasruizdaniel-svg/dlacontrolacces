from sqlalchemy import Column, String, Text
from app.core.database import Base

class SystemConfig(Base):
    __tablename__ = "system_config"

    key = Column(String(64), primary_key=True, index=True)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
