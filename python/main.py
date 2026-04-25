"""Simple terminal runner for landing-point prediction.

Input example:
    weapon: GlideBomb, position: (198.3, 300), speed: 3.5

Optional fields:
	direction: 0   (or dir: 0)
	time: 10
"""

from __future__ import annotations

import re
import sys
from typing import Tuple, Dict, Any

from threat import Threat
import weapon as weapon_module


def _find_number(text: str, key: str):
	m = re.search(rf"\b{re.escape(key)}\s*:\s*(-?\d+(?:\.\d+)?)", text, flags=re.IGNORECASE)
	if not m:
		return None
	return float(m.group(1))


def _find_position(text: str):
	m = re.search(
		r"position\s*:\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)",
		text,
		flags=re.IGNORECASE,
	)
	if not m:
		return None
	return float(m.group(1)), float(m.group(2))


def parse_input(line: str) -> Dict[str, Any]:
	weapon_match = re.search(r"weapon\s*:\s*([^,]+)", line, flags=re.IGNORECASE)
	weapon = weapon_match.group(1).strip() if weapon_match else "Unknown"

	position = _find_position(line)
	speed = _find_number(line, "speed")
	direction = _find_number(line, "direction")
	if direction is None:
		direction = _find_number(line, "dir")
	time_seconds = _find_number(line, "time")

	if position is None:
		raise ValueError("Missing position. Use: position: (x, y)")
	if speed is None:
		raise ValueError("Missing speed. Use: speed: 3.5")

	# Assumptions for minimal input:
	# - direction defaults to north (0°)
	# - time is optional; if omitted we'll try to use the weapon's range
	if direction is None:
		direction = 0.0

	return {
		"weapon": weapon,
		"position": position,
		"speed": speed,
		"direction": direction,
		"time": time_seconds,
	}


def run_prediction(line: str) -> str:
	data = parse_input(line)
	# Determine time: prefer explicit time, else compute from weapon range / speed
	time_seconds = data.get("time")
	weapon_name = data.get("weapon")
	speed = data.get("speed")

	if time_seconds is None and weapon_name and speed:
		w_obj = None
		# Try direct class lookup by name
		try:
			cls = getattr(weapon_module, weapon_name)
			if isinstance(cls, type):
				try:
					w_obj = cls()
				except Exception:
					w_obj = None
		except Exception:
			w_obj = None

		# Fallback: instantiate available weapon classes and match .name
		if w_obj is None:
			for attr in dir(weapon_module):
				attr_val = getattr(weapon_module, attr)
				if isinstance(attr_val, type):
					try:
						inst = attr_val()
					except Exception:
						continue
					if getattr(inst, 'name', '').lower() == weapon_name.lower():
						w_obj = inst
						break

		if w_obj is not None and hasattr(w_obj, 'range'):
			if speed and speed > 0:
				time_seconds = float(w_obj.range) / float(speed)
			else:
				raise ValueError("Speed must be > 0 to compute time from weapon range")

	# Final default if still missing
	if time_seconds is None:
		time_seconds = 10.0

	threat = Threat(position=data["position"], speed=data["speed"], direction=data["direction"])
	landing_x, landing_y = threat.predict_landing_coordinates(time_seconds)

	return (
		f"Input: weapon={data['weapon']}, position={data['position']}, speed={data['speed']}, "
		f"direction={data['direction']}°, time={time_seconds:.3f}s\n"
		f"Predicted landing point: ({landing_x:.3f}, {landing_y:.3f})"
	)


def main() -> None:
	if len(sys.argv) > 1:
		line = " ".join(sys.argv[1:]).strip()
	else:
		line = input("Enter: weapon, position, speed, direction (optional time): ").strip()

	try:
		print(run_prediction(line))
	except Exception as exc:
		print(f"Input error: {exc}")
		print("Example: weapon: GlideBomb, position: (198.3, 300), speed: 3.5, direction: 45, time: 10")
		print("Also valid: weapon: GlideBomb, position: (198.3, 300), speed: 3.5, dir: 45")
		raise SystemExit(1)


if __name__ == "__main__":
	main()

