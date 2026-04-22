import time
import json
import redis
import requests
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from collections import deque
import random

# Deep Q-Network for Traffic Light Control
class DQN(nn.Module):
    def __init__(self, input_dim, output_dim):
        super(DQN, self).__init__()
        self.fc1 = nn.Linear(input_dim, 64)
        self.fc2 = nn.Linear(64, 64)
        self.fc3 = nn.Linear(64, output_dim)
        
    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        return self.fc3(x)

class TrafficAgent:
    def __init__(self):
        self.r = redis.Redis(host='localhost', port=6379, decode_responses=True)
        self.pubsub = self.r.pubsub()
        self.pubsub.subscribe('telemetry_stream')
        self.api_url = "http://localhost:8000/api/override"
        
        # State: density, queueLength, avgSpeed (3 dims per junction)
        # Actions: 0 (No Action), 1 (Force Green), 2 (Force Red)
        self.models = {}
        self.memory = deque(maxlen=2000)
        self.gamma = 0.95
        self.epsilon = 1.0
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.optimizer = None
        self.criterion = nn.MSELoss()
        
    def init_model(self, junction_id):
        if junction_id not in self.models:
            print(f"Initializing Deep RL Agent for Junction {junction_id}")
            model = DQN(3, 3)
            self.models[junction_id] = {
                'model': model,
                'optimizer': optim.Adam(model.parameters(), lr=0.001)
            }
            
    def get_state(self, data):
        return np.array([data.get('density', 0), data.get('queueLength', 0), data.get('avgSpeed', 0)], dtype=np.float32)
        
    def act(self, junction_id, state):
        if np.random.rand() <= self.epsilon:
            return random.randrange(3)
        state_tensor = torch.FloatTensor(state).unsqueeze(0)
        q_values = self.models[junction_id]['model'](state_tensor)
        return torch.argmax(q_values[0]).item()
        
    def execute_action(self, junction_id, action):
        if action == 1:
            requests.post(self.api_url, json={"junction_id": junction_id, "action": "FORCE_GREEN"})
            print(f"[RL Deep Agent] Intervening at {junction_id}: FORCE_GREEN")
        elif action == 2:
            requests.post(self.api_url, json={"junction_id": junction_id, "action": "FORCE_RED"})
            print(f"[RL Deep Agent] Intervening at {junction_id}: FORCE_RED")
            
    def run(self):
        print("Listening to telemetry stream for real-time Deep RL overrides...")
        for message in self.pubsub.listen():
            if message['type'] == 'message':
                try:
                    telemetry = json.loads(message['data'])
                    for junction in telemetry:
                        jid = junction['id']
                        # Only target heavily congested junctions for learning focus
                        if junction['density'] > 80:
                            self.init_model(jid)
                            state = self.get_state(junction)
                            action = self.act(jid, state)
                            
                            # Execute the action picked by the neural network
                            if action != 0:
                                self.execute_action(jid, action)
                                
                            # If we hit this, it means the agent intervened. 
                            # Wait a bit before making another decision.
                            time.sleep(2)
                            
                except Exception as e:
                    print(f"Error processing stream: {e}")

if __name__ == "__main__":
    agent = TrafficAgent()
    agent.run()
