from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json
import random
from emergentintegrations.llm.chat import LlmChat, UserMessage
import replicate
import asyncio
from typing import Dict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Load errors knowledge base
with open(ROOT_DIR / 'errors.json', 'r') as f:
    errors_data = json.load(f)
    ERRORS_KB = {error['code']: error for error in errors_data['errors']}

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Robot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bot_id: str
    status: str  # idle, picking, dropping, charging, error
    position_x: int
    position_y: int
    battery: int
    current_task: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RobotCreate(BaseModel):
    bot_id: str
    status: str = "idle"
    position_x: int = 0
    position_y: int = 0
    battery: int = 100

class CopilotRequest(BaseModel):
    error_code: str
    bot_id: Optional[str] = None

class CopilotResponse(BaseModel):
    error_code: str
    title: str
    description: str
    recovery_steps: List[str]
    llm_explanation: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    bot_id: str
    error_code: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

# Initialize robots on startup
@app.on_event("startup")
async def startup_event():
    # Clear existing robots
    await db.robots.delete_many({})
    
    # Create 10 robots in a 5x2 grid
    robots = []
    for i in range(10):
        robot = Robot(
            bot_id=f"BOT-{str(i+1).zfill(3)}",
            status="idle",
            position_x=i % 5,
            position_y=i // 5,
            battery=random.randint(60, 100)
        )
        doc = robot.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.robots.insert_one(doc)
        robots.append(robot)
    
    logging.info(f"Initialized {len(robots)} robots")

# Routes
@api_router.get("/")
async def root():
    return {"message": "Warehouse Robot AI Copilot API"}

@api_router.get("/robots", response_model=List[Robot])
async def get_robots():
    robots = await db.robots.find({}, {"_id": 0}).to_list(100)
    
    for robot in robots:
        if isinstance(robot['updated_at'], str):
            robot['updated_at'] = datetime.fromisoformat(robot['updated_at'])
    
    return robots

@api_router.get("/robots/{bot_id}", response_model=Robot)
async def get_robot(bot_id: str):
    robot = await db.robots.find_one({"bot_id": bot_id}, {"_id": 0})
    
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    if isinstance(robot['updated_at'], str):
        robot['updated_at'] = datetime.fromisoformat(robot['updated_at'])
    
    return robot

@api_router.post("/robots/simulate")
async def simulate_robots():
    """Simulate robot state changes and random errors"""
    robots = await db.robots.find({}).to_list(100)
    
    for robot in robots:
        # Skip if robot is already in error state (let operator fix it first)
        if robot['status'] == 'error' and robot.get('error_code'):
            continue
        
        # Battery drain
        if robot['status'] != 'charging':
            robot['battery'] = max(0, robot['battery'] - random.randint(1, 5))
        else:
            robot['battery'] = min(100, robot['battery'] + random.randint(5, 10))
        
        # State transitions
        if robot['battery'] < 20 and robot['status'] != 'charging':
            robot['status'] = 'charging'
            robot['current_task'] = 'Charging battery'
        elif robot['battery'] > 80 and robot['status'] == 'charging':
            robot['status'] = 'idle'
            robot['current_task'] = None
        elif robot['status'] == 'idle' and random.random() > 0.6:
            robot['status'] = 'picking'
            robot['current_task'] = f'Pick from Zone {random.choice(["A", "B", "C", "D"])}'
        elif robot['status'] == 'picking' and random.random() > 0.5:
            robot['status'] = 'dropping'
            robot['current_task'] = f'Drop to Station {random.randint(1, 5)}'
        elif robot['status'] == 'dropping' and random.random() > 0.5:
            robot['status'] = 'idle'
            robot['current_task'] = None
        
        # Random errors (5% chance)
        if robot['status'] != 'error' and random.random() < 0.05:
            error_code = random.choice(list(ERRORS_KB.keys()))
            error = ERRORS_KB[error_code]
            robot['status'] = 'error'
            robot['error_code'] = error_code
            robot['error_message'] = error['title']
        
        # Update position slightly
        if robot['status'] in ['picking', 'dropping']:
            robot['position_x'] = max(0, min(4, robot['position_x'] + random.choice([-1, 0, 1])))
            robot['position_y'] = max(0, min(1, robot['position_y'] + random.choice([-1, 0, 1])))
        
        robot['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.robots.update_one(
            {"bot_id": robot['bot_id']},
            {"$set": robot}
        )
    
    return {"message": "Simulation step completed"}

@api_router.post("/copilot/ask", response_model=CopilotResponse)
async def ask_copilot(request: CopilotRequest):
    """Get AI copilot advice for an error"""
    error_code = request.error_code
    
    if error_code not in ERRORS_KB:
        raise HTTPException(status_code=404, detail="Error code not found")
    
    error = ERRORS_KB[error_code]
    
    # Use LLM to rephrase steps in operator-friendly language
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"copilot-{error_code}",
            system_message="You are a helpful warehouse operations assistant. Explain robot errors and recovery steps in simple, friendly language that any operator can understand. Keep responses concise and action-oriented."
        ).with_model("openai", "gpt-4o-mini")
        
        steps_text = "\n".join([f"{i+1}. {step}" for i, step in enumerate(error['steps'])])
        
        user_message = UserMessage(
            text=f"""A warehouse robot has encountered error '{error['title']}: {error['description']}'

Here are the technical recovery steps:
{steps_text}

Please rephrase these steps in friendly, easy-to-understand language for a warehouse operator. Keep it brief and encouraging."""
        )
        
        llm_response = await chat.send_message(user_message)
        
        return CopilotResponse(
            error_code=error_code,
            title=error['title'],
            description=error['description'],
            recovery_steps=error['steps'],
            llm_explanation=llm_response
        )
    except Exception as e:
        logging.error(f"LLM call failed: {str(e)}")
        # Fallback to just returning the steps
        return CopilotResponse(
            error_code=error_code,
            title=error['title'],
            description=error['description'],
            recovery_steps=error['steps'],
            llm_explanation=None
        )

@api_router.post("/robots/{bot_id}/clear-error")
async def clear_robot_error(bot_id: str):
    """Clear error state from a robot"""
    result = await db.robots.update_one(
        {"bot_id": bot_id},
        {"$set": {
            "status": "idle",
            "error_code": None,
            "error_message": None,
            "current_task": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    return {"message": "Error cleared successfully"}

@api_router.post("/copilot/chat", response_model=ChatResponse)
async def chat_with_copilot(request: ChatMessage):
    """Chat with AI copilot about a specific robot error"""
    
    # Get robot details
    robot = await db.robots.find_one({"bot_id": request.bot_id}, {"_id": 0})
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    # Get error details from knowledge base
    error = ERRORS_KB.get(request.error_code)
    if not error:
        raise HTTPException(status_code=404, detail="Error code not found")
    
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        # Create/reuse session for continuous conversation
        session_id = request.session_id or f"chat-{request.bot_id}-{request.error_code}-{datetime.now(timezone.utc).timestamp()}"
        
        # Build context-rich system message
        steps_text = "\n".join([f"{i+1}. {step}" for i, step in enumerate(error['steps'])])
        
        system_message = f"""You are a helpful AI assistant for warehouse robot operations. You're helping an operator resolve an issue with robot {request.bot_id}.

Current Robot Status:
- Bot ID: {request.bot_id}
- Battery: {robot.get('battery', 'Unknown')}%
- Position: X={robot.get('position_x', 'Unknown')}, Y={robot.get('position_y', 'Unknown')}
- Current Task: {robot.get('current_task', 'None')}

Error Information:
- Error Code: {request.error_code}
- Error Title: {error['title']}
- Description: {error['description']}

Recovery Steps:
{steps_text}

Your role:
- Answer questions about this specific error and robot
- Provide clear, encouraging guidance
- Help operators understand the steps
- Suggest alternatives or clarifications when asked
- Keep responses concise and action-oriented
- Be friendly and supportive"""

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=request.message)
        llm_response = await chat.send_message(user_message)
        
        return ChatResponse(
            response=llm_response,
            session_id=session_id
        )
        
    except Exception as e:
        logging.error(f"Chat failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()