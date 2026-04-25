from pydantic import BaseModel
from typing import Dict

class Threat(BaseModel):
    """
    Represents an incoming threat with its weapon type, position, and speed.
    """
    id: str
    weapon_type: str
    location: Dict[str, float]  # Format: {"x": 0.0, "y": 0.0, "z": 0.0}
    speed: float  # Speed of the threat in units/second
