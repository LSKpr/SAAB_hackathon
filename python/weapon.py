import random


class Weapon:
    def __init__(self, name, max_range: float, base_damage: int):
        self.name = name
        self.range = float(max_range)
        self.base_damage = base_damage

    def get_damage(self):
        # default variability (can be overridden)
        return random.randint(self.base_damage - 5, self.base_damage + 5)

    def __str__(self):
        return f"{self.name} (Damage: {self.get_damage()})"


# =========================
# Fighters
# =========================

class Fighter4Gen(Weapon):
    def __init__(self):
        # range in km, base_damage
        super().__init__("4th Gen Fighter", 1500.0, 70)

    def get_damage(self):
        return random.randint(60, 90)


class Fighter5Gen(Weapon):
    def __init__(self):
        super().__init__("5th Gen Stealth Fighter", 1500.0, 85)

    def get_damage(self):
        return random.randint(75, 110)


# =========================
# Cruise Missiles
# =========================

class CruiseMissileSubsonic(Weapon):
    def __init__(self):
        super().__init__("Subsonic Cruise Missile", 1000.0, 60)

    def get_damage(self):
        return random.randint(55, 65)


class CruiseMissileSupersonic(Weapon):
    def __init__(self):
        super().__init__("Supersonic Cruise Missile", 1200.0, 75)

    def get_damage(self):
        return random.randint(70, 95)


# =========================
# Ballistic / Hypersonic
# =========================

class BallisticSRBM(Weapon):
    def __init__(self):
        super().__init__("SRBM (Iskander-class)", 300.0, 90)

    def get_damage(self):
        return random.randint(85, 120)


class HypersonicGlideVehicle(Weapon):
    def __init__(self):
        super().__init__("Hypersonic Glide Vehicle", 2000.0, 95)

    def get_damage(self):
        return random.randint(90, 130)


class HypersonicCruiseMissile(Weapon):
    def __init__(self):
        super().__init__("Hypersonic Cruise Missile", 1500.0, 92)

    def get_damage(self):
        return random.randint(85, 125)


# =========================
# UAVs / Drones
# =========================

class MALEUAV(Weapon):
    def __init__(self):
        super().__init__("MALE/HALE UAV", 300.0, 40)

    def get_damage(self):
        return random.randint(30, 60)


class LoiteringMunition(Weapon):
    def __init__(self):
        super().__init__("Loitering Munition", 200.0, 55)

    def get_damage(self):
        return random.randint(45, 75)


class DroneSwarm(Weapon):
    def __init__(self):
        super().__init__("Drone Swarm", 50.0, 65)

    def get_damage(self):
        return random.randint(50, 100)


# =========================
# Other Threats
# =========================

class Bomber(Weapon):
    def __init__(self):
        super().__init__("Strategic Bomber", 5000.0, 80)

    def get_damage(self):
        return random.randint(75, 95)


class Helicopter(Weapon):
    def __init__(self):
        super().__init__("Attack Helicopter", 500.0, 45)

    def get_damage(self):
        return random.randint(35, 65)


class GlideBomb(Weapon):
    def __init__(self):
        super().__init__("Glide Bomb", 100.0, 65)

    def get_damage(self):
        return random.randint(55, 85)


class AntiRadiationMissile(Weapon):
    def __init__(self):
        super().__init__("Anti-Radiation Missile", 400.0, 70)

    def get_damage(self):
        return random.randint(60, 95)
