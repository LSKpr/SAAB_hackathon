import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000"

def test_add_threat():
    print("Testing add_threat...")
    payload = {
        "id": "T1",
        "weapon_type": "MISSILE",
        "location": {"x": 10.0, "y": 20.0, "z": 5.0},
        "speed": 500.0
    }
    response = requests.post(f"{BASE_URL}/threats", json=payload)
    print(f"Status: {response.status_code}, Response: {response.json()}")

def test_get_threats():
    print("Testing get_threats...")
    response = requests.get(f"{BASE_URL}/threats")
    print(f"Status: {response.status_code}, Response: {response.json()}")

def test_get_potential():
    print("Testing get_potential...")
    response = requests.get(f"{BASE_URL}/potential")
    print(f"Status: {response.status_code}, Response: {response.json()}")

if __name__ == "__main__":
    # Note: main.py must be running in the background for this to work
    print("Ensure main.py is running before starting tests.")
    try:
        test_add_threat()
        test_get_threats()
        test_get_potential()
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is main.py running?")
