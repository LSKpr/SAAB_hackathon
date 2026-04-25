from pydantic import BaseModel, Field
from typing import Dict

class Target(BaseModel):
    """
    Represents a potential target for threats.
    """
    id: str
    location: Dict[str, float]  # Format: {"x": 0.0, "y": 0.0, "z": 0.0}
    location_type: str  # e.g., "CITY", "MILITARY_BASE", "POWER_PLANT"
    importance_level: int = Field(..., ge=1, le=10)  # Importance level from 1 to 10

# Pre-filled Example Constants
TARGET_TYPES = ["CITY", "MILITARY_BASE", "POWER_PLANT"]
