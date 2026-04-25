import math
from typing import Tuple


class Threat:
	"""Simple threat model with position, speed, and direction."""

	def __init__(self, position: Tuple[float, float], speed: float, direction: float):
		self.position = position      # (x, y)
		self.speed = float(speed)     # units per second
		self.direction = float(direction)  # degrees, clockwise from north

	def predict_landing_coordinates(self, time_seconds: float) -> Tuple[float, float]:
		"""Return approximate landing coordinates after `time_seconds`."""
		return calculate_landing_coordinates(
			position=self.position,
			speed=self.speed,
			direction=self.direction,
			time_seconds=time_seconds,
		)


def calculate_landing_coordinates(
	position: Tuple[float, float],
	speed: float,
	direction: float,
	time_seconds: float,
) -> Tuple[float, float]:
	"""Approximate where a threat will land after `time_seconds`.

	Direction convention:
	- 0°   = north (+y)
	- 90°  = east  (+x)
	- 180° = south (-y)
	- 270° = west  (-x)
	"""
	x0, y0 = position
	distance = float(speed) * float(time_seconds)

	rad = math.radians(direction)
	dx = distance * math.sin(rad)
	dy = distance * math.cos(rad)

	return x0 + dx, y0 + dy

