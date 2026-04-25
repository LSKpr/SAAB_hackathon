from pydantic import BaseModel

class Weapon(BaseModel):
    """
    Represents a weapon type and its associated damage potential.
    """
    weapon_type: str
    expected_damage: float  # Multiplicator for the damage potential (e.g., 1.5, 2.0)
