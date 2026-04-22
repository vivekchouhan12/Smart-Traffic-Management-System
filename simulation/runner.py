import os
import sys
import time
import json
import traci
import redis

# Ensure SUMO_HOME is set
if 'SUMO_HOME' in os.environ:
    tools = os.path.join(os.environ['SUMO_HOME'], 'tools')
    sys.path.append(tools)
else:
    # Try common windows path if not set
    tools = r'C:\Users\raiis\AppData\Local\Python\pythoncore-3.14-64\Lib\site-packages\sumolib'
    sys.path.append(tools)

from sumolib import checkBinary

def run_simulation(gui=False):
    # Try to find sumo-gui or sumo in PATH, or default to checking eclipse-sumo scripts
    sumoBinary = 'sumo-gui' if gui else 'sumo'
    
    cfg_file = os.path.join(os.path.dirname(__file__), "nets", "silkboard", "silkboard.sumocfg")
    
    sumoCmd = [
        sumoBinary, 
        "-c", cfg_file,
        "--step-length", "1",
        "--waiting-time-memory", "100"
    ]

    r = redis.Redis(host='localhost', port=6379, decode_responses=True)
    try:
        r.ping()
        print("Connected to Redis successfully.")
    except Exception as e:
        print("Warning: Could not connect to Redis. Proceeding without broadcasting.")

    traci.start(sumoCmd)
    tl_ids = traci.trafficlight.getIDList()
    print(f"Connected to SUMO. Found Traffic Lights: {tl_ids}")

    step = 0
    while step < 3600:
        traci.simulationStep()
        
        if step % 5 == 0:
            state_data = []
            for tl in tl_ids:
                controlled_links = traci.trafficlight.getControlledLinks(tl)
                vehicle_count = 0
                queue_length = 0
                for link in controlled_links:
                    if link:
                        lane = link[0][0]
                        vehicle_count += traci.lane.getLastStepVehicleNumber(lane)
                        queue_length += traci.lane.getLastStepHaltingNumber(lane)
                
                state_data.append({
                    "id": tl,
                    "name": f"Junction {tl}",
                    "lat": 0.0, 
                    "lng": 0.0,
                    "vehicleCount": vehicle_count,
                    "density": min(100, vehicle_count * 5),
                    "avgSpeed": 0,
                    "queueLength": queue_length,
                    "status": "alert" if queue_length > 10 else "active"
                })
            
            try:
                r.publish("telemetry_stream", json.dumps(state_data))
            except:
                pass
            
        step += 1
        time.sleep(0.01)

    traci.close()

if __name__ == "__main__":
    run_simulation(gui=False)
