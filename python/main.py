from flask import Flask, request, jsonify
from threading import Lock
from typing import List, Dict

from threat import Threat
from target import Target
from weapon import Weapon
import logic

app = Flask(__name__)

# Concurrent storage and locks
state = {
    "threats": [],
    "targets": [],
    "weapons": {
        "MISSILE": Weapon(weapon_type="MISSILE", expected_damage=2.5),
        "DRONE": Weapon(weapon_type="DRONE", expected_damage=1.2),
        "ARTILLERY": Weapon(weapon_type="ARTILLERY", expected_damage=1.8)
    }
}
lock = Lock()

@app.route('/threats', methods=['POST'])
def add_threat():
    """
    Endpoint to add a new threat.
    """
    data = request.json
    try:
        new_threat = Threat(**data)
        with lock:
            state["threats"].append(new_threat)
        return jsonify({"status": "success", "message": f"Threat {new_threat.id} added"}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/threats', methods=['GET'])
def get_threats():
    """
    Endpoint to list all current threats.
    """
    with lock:
        return jsonify([t.model_dump() for t in state["threats"]]), 200

@app.route('/targets', methods=['POST'])
def add_target():
    """
    Endpoint to add a new potential target.
    """
    data = request.json
    try:
        new_target = Target(**data)
        with lock:
            state["targets"].append(new_target)
        return jsonify({"status": "success", "message": f"Target {new_target.id} added"}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/targets', methods=['GET'])
def get_targets():
    """
    Endpoint to list all potential targets.
    """
    with lock:
        return jsonify([t.model_dump() for t in state["targets"]]), 200

@app.route('/potential', methods=['GET'])
def get_threat_potential():
    """
    Endpoint to get the total threat potential calculated from all current threats.
    """
    results = []
    with lock:
        for threat in state["threats"]:
            weapon = state["weapons"].get(threat.weapon_type)
            potential = logic.calculate_threat_potential(threat, weapon)
            likely_target = logic.match_threat_to_target(threat, state["targets"])
            
            results.append({
                "threat_id": threat.id,
                "potential_score": potential,
                "likely_target_id": likely_target.id if likely_target else None
            })
            
    return jsonify(results), 200

if __name__ == '__main__':
    # Initializing some default targets as per the plan
    with lock:
        state["targets"].append(Target(id="BASE_01", location={"x": 100, "y": 200, "z": 0}, location_type="MILITARY_BASE", importance_level=9))
        state["targets"].append(Target(id="CITY_ALPHA", location={"x": 500, "y": 500, "z": 0}, location_type="CITY", importance_level=7))

    app.run(debug=True, host='0.0.0.0', port=5000)
