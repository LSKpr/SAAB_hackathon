import math
from typing import List, Optional
from threat import Threat
from target import Target
from weapon import Weapon

def calculate_threat_potential(threat: Threat, weapon: Optional[Weapon]) -> float:
    """
    Stub: Calculate the potential damage/threat level of a given threat.
    
    Formula Idea: speed * weapon_multiplier / distance_to_important_target
    """
    damage_multiplier = weapon.expected_damage if weapon else 1.0
    # Base calculation stub
    potential = threat.speed * damage_multiplier
    return round(potential, 2)

def get_importance_level_for_threat(threat: Threat, targets: List[Target]) -> float:
    """
    Stub: Determine the threat level based on proximity and target importance.
    """
    if not targets:
        return 0.0
    
    # Logic to weigh threat against all targets
    return 1.0  # Placeholder

def match_threat_to_target(threat: Threat, targets: List[Target]) -> Optional[Target]:
    """
    Stub: Predict which target the threat is most likely aiming for.
    
    Logic Idea: Closest target or target in the current trajectory.
    """
    if not targets:
        return None
        
    def distance(p1, p2):
        return math.sqrt(sum((p1.get(k, 0) - p2.get(k, 0))**2 for k in ['x', 'y', 'z']))

    # Simple nearest target logic as a placeholder
    closest_target = min(targets, key=lambda t: distance(threat.location, t.location))
    return closest_target
