from fastapi import FastAPI, WebSocket
import uvicorn
import redis.asyncio as redis
from typing import List

app = FastAPI(title="Smart Traffic API")
redis_client = None

@app.on_event("startup")
async def startup_event():
    global redis_client
    # Connect to localhost redis if running local python script fallback
    try:
        redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    except Exception as e:
        print(f"Warning: Could not connect to Redis: {e}")

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Backend API"}

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math
import time

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OverrideRequest(BaseModel):
    junction_id: str
    action: str

@app.post("/api/override")
async def manual_override(req: OverrideRequest):
    if not redis_client:
        return {"error": "Redis not connected"}
    
    # Broadcast the command on the command_stream for the SUMO runner to pick up
    try:
        await redis_client.publish("command_stream", f"{req.junction_id}:{req.action}")
        return {"status": "success", "message": f"Applied {req.action} to {req.junction_id}"}
    except Exception as e:
        # Fallback to prevent 500 error if redis is not running 
        print(f"Failed to publish to Redis: {e}")
        return {"status": "error", "message": f"Redis connection failed: {e}"}
    
@app.get("/api/forecast/{junction_id}")
async def get_forecast(junction_id: str):
    # Predictive AI Module (Hackathon Demo)
    # Generates a 30-minute forward prediction using a trigonometric series overlay
    # to simulate a complex time-series neural network forecast curve.
    base_time = int(time.time())
    predictions = []
    
    # 6 points -> 5 minute intervals for 30 minutes
    for i in range(6):
        future_time = base_time + (i * 300) 
        # Generate a realistic density curve between 30% and 95%
        predicted_density = 60 + 25 * math.sin(future_time / 1000.0) + 10 * math.cos(hash(junction_id) % 100)
        predictions.append({
            "timestamp": future_time,
            "predicted_density": min(98.0, max(10.0, predicted_density)),
            "confidence": 0.95 - (i * 0.05)
        })
        
    return {
        "junction_id": junction_id,
        "forecast_horizon": "30 minutes",
        "predictions": predictions
    }
    
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    if not redis_client:
        await websocket.send_text("Error: Redis Not Connected")
        await websocket.close()
        return
        
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("telemetry_stream")
    
    try:
        async for message in pubsub.listen():
            if message['type'] == 'message':
                await websocket.send_text(message['data'])
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        await pubsub.unsubscribe("telemetry_stream")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
