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

class VideoGenerationRequest(BaseModel):
    error_code: str
    bot_id: str

class VideoGenerationResponse(BaseModel):
    status: str  # "generating", "completed", "failed"
    video_url: Optional[str] = None
    prompt: Optional[str] = None
    message: str

# Initialize robots on startup
@app.on_event("startup")
async def startup_event():
    # Clear existing robots
    await db.robots.delete_many({})
    
    # Starting positions for 10 robots (dispersed across the grid)
    start_positions = [
        (1, 1), (3, 1), (6, 1), (8, 1),
        (1, 6), (3, 6), (6, 6), (8, 6),
        (4, 3), (5, 4)
    ]
    
    robots = []
    for i in range(10):
        pos_x, pos_y = start_positions[i]
        robot = Robot(
            bot_id=f"BOT-{str(i+1).zfill(3)}",
            status="idle",
            position_x=pos_x,
            position_y=pos_y,
            battery=random.randint(60, 100)
        )
        doc = robot.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.robots.insert_one(doc)
        robots.append(robot)
    
    logging.info(f"Initialized {len(robots)} robots on warehouse grid")

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
    """Simulate robot state changes with grid-based pathfinding and collision avoidance"""
    robots = await db.robots.find({}).to_list(100)
    
    # Grid dimensions
    GRID_COLS = 10
    GRID_ROWS = 8
    
    # Define zones
    picking_zones = [(0, 0), (9, 0), (0, 7), (9, 7)]
    dropping_zones = [(4, 0), (5, 0), (4, 7), (5, 7)]
    charging_stations = [(2, 3), (7, 3), (2, 4), (7, 4)]
    
    # Create occupancy map
    occupied_positions = set()
    for robot in robots:
        if robot.get('position_x') is not None and robot.get('position_y') is not None:
            occupied_positions.add((robot['position_x'], robot['position_y']))
    
    def find_nearest_zone(current_pos, zone_list, occupied):
        """Find nearest available zone using Manhattan distance"""
        best_zone = None
        best_dist = float('inf')
        
        for zone in zone_list:
            if zone not in occupied or zone == current_pos:
                dist = abs(zone[0] - current_pos[0]) + abs(zone[1] - current_pos[1])
                if dist < best_dist:
                    best_dist = dist
                    best_zone = zone
        
        return best_zone if best_zone else zone_list[0]
    
    def move_towards(current_pos, target_pos, occupied):
        """Move one step towards target, avoiding collisions"""
        x, y = current_pos
        tx, ty = target_pos
        
        # Calculate next position
        next_x, next_y = x, y
        
        # Prioritize horizontal or vertical movement based on distance
        if abs(tx - x) > abs(ty - y):
            # Move horizontally
            if tx > x:
                next_x = min(x + 1, GRID_COLS - 1)
            elif tx < x:
                next_x = max(x - 1, 0)
        else:
            # Move vertically
            if ty > y:
                next_y = min(y + 1, GRID_ROWS - 1)
            elif ty < y:
                next_y = max(y - 1, 0)
        
        # Check if next position is occupied
        if (next_x, next_y) in occupied and (next_x, next_y) != target_pos:
            # Try alternative direction
            if next_x == x:  # Was moving vertically, try horizontal
                if tx > x:
                    next_x = min(x + 1, GRID_COLS - 1)
                elif tx < x:
                    next_x = max(x - 1, 0)
                next_y = y
            else:  # Was moving horizontally, try vertical
                if ty > y:
                    next_y = min(y + 1, GRID_ROWS - 1)
                elif ty < y:
                    next_y = max(y - 1, 0)
                next_x = x
        
        # If still occupied, stay in place
        if (next_x, next_y) in occupied and (next_x, next_y) != target_pos:
            return x, y
        
        return next_x, next_y
    
    for robot in robots:
        # Skip if robot is already in error state
        if robot['status'] == 'error' and robot.get('error_code'):
            continue
        
        current_pos = (robot['position_x'], robot['position_y'])
        
        # Remove current position from occupied for movement calculation
        occupied_positions.discard(current_pos)
        
        # Battery management
        if robot['status'] != 'charging':
            robot['battery'] = max(0, robot['battery'] - random.randint(1, 3))
        else:
            robot['battery'] = min(100, robot['battery'] + random.randint(8, 12))
        
        # State transitions and movement
        if robot['battery'] < 20 and robot['status'] != 'charging':
            # Low battery - go to charging station
            robot['status'] = 'charging'
            robot['current_task'] = 'Moving to charging station'
            target = find_nearest_zone(current_pos, charging_stations, occupied_positions)
            new_x, new_y = move_towards(current_pos, target, occupied_positions)
            robot['position_x'], robot['position_y'] = new_x, new_y
            
            # Check if reached charging station
            if (new_x, new_y) in charging_stations:
                robot['current_task'] = 'Charging battery'
        
        elif robot['battery'] > 80 and robot['status'] == 'charging':
            # Fully charged - become idle
            robot['status'] = 'idle'
            robot['current_task'] = None
        
        elif robot['status'] == 'idle' and random.random() > 0.5:
            # Start picking task
            robot['status'] = 'picking'
            zone_letter = random.choice(['A', 'B', 'C', 'D'])
            robot['current_task'] = f'Moving to Zone {zone_letter}'
            target = find_nearest_zone(current_pos, picking_zones, occupied_positions)
            new_x, new_y = move_towards(current_pos, target, occupied_positions)
            robot['position_x'], robot['position_y'] = new_x, new_y
            
            # Check if reached picking zone
            if (new_x, new_y) in picking_zones:
                robot['current_task'] = f'Picking from Zone {zone_letter}'
        
        elif robot['status'] == 'picking':
            # Move towards picking zone if not there yet
            if current_pos not in picking_zones:
                target = find_nearest_zone(current_pos, picking_zones, occupied_positions)
                new_x, new_y = move_towards(current_pos, target, occupied_positions)
                robot['position_x'], robot['position_y'] = new_x, new_y
            else:
                # At picking zone, maybe transition to dropping
                if random.random() > 0.3:
                    robot['status'] = 'dropping'
                    station_num = random.randint(1, 4)
                    robot['current_task'] = f'Moving to Station {station_num}'
        
        elif robot['status'] == 'dropping':
            # Move towards dropping zone
            if current_pos not in dropping_zones:
                target = find_nearest_zone(current_pos, dropping_zones, occupied_positions)
                new_x, new_y = move_towards(current_pos, target, occupied_positions)
                robot['position_x'], robot['position_y'] = new_x, new_y
                
                if (new_x, new_y) in dropping_zones:
                    station_num = dropping_zones.index((new_x, new_y)) + 1
                    robot['current_task'] = f'Dropping at Station {station_num}'
            else:
                # At dropping zone, transition to idle
                if random.random() > 0.4:
                    robot['status'] = 'idle'
                    robot['current_task'] = None
        
        # Random errors (3% chance)
        if robot['status'] != 'error' and random.random() < 0.03:
            error_code = random.choice(list(ERRORS_KB.keys()))
            error = ERRORS_KB[error_code]
            robot['status'] = 'error'
            robot['error_code'] = error_code
            robot['error_message'] = error['title']
        
        # Add new position to occupied set
        new_pos = (robot['position_x'], robot['position_y'])
        occupied_positions.add(new_pos)
        
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
            system_message="You are an expert warehouse operations assistant helping operators resolve robot issues. Explain errors and recovery steps in simple, friendly language. Be encouraging but realistic - mention when professional help is needed. Keep responses conversational and concise (3-4 sentences max for initial explanation)."
        ).with_model("openai", "gpt-4o-mini")
        
        steps_text = "\n".join([f"{i+1}. {step}" for i, step in enumerate(error['steps'])])
        
        user_message = UserMessage(
            text=f"""A warehouse robot has error: '{error['title']}'
Description: {error['description']}

Recovery steps:
{steps_text}

Give a brief, encouraging initial explanation (3-4 sentences) that:
1. Acknowledges the issue in simple terms
2. Explains what likely caused it
3. Gives confidence it's usually fixable OR mentions if it needs a technician
4. Invites them to ask questions

Do NOT list all the steps - they can see those. Be conversational."""
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

@api_router.post("/copilot/generate-video", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest):
    """Generate AI video demonstration for error resolution"""
    
    # Get error details
    error = ERRORS_KB.get(request.error_code)
    if not error:
        raise HTTPException(status_code=404, detail="Error code not found")
    
    # Get robot details
    robot = await db.robots.find_one({"bot_id": request.bot_id}, {"_id": 0})
    if not robot:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    try:
        # Use LLM to generate optimized video prompt
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"video-prompt-{request.error_code}",
            system_message="You are an expert at creating video generation prompts for technical repair demonstrations. Create short, descriptive prompts that will generate clear instructional videos showing warehouse robot repair procedures."
        ).with_model("openai", "gpt-4o-mini")
        
        steps_text = "\\n".join([f"{i+1}. {step}" for i, step in enumerate(error['steps'])])
        
        user_message = UserMessage(
            text=f"""Create a detailed video generation prompt for an instructional video showing how to fix this warehouse robot error:

Error: {error['title']}
Description: {error['description']}

Recovery Steps:
{steps_text}

Generate a prompt for a 5-10 second video that visually demonstrates the KEY repair action (pick the most visual/important step). The video should:
- Show a warehouse robot with the specific issue
- Demonstrate the repair action clearly
- Be from a first-person operator perspective
- Include hands performing the action
- Be realistic and professional

Return ONLY the video generation prompt, nothing else. Keep it under 400 characters."""
        )
        
        video_prompt = await chat.send_message(user_message)
        logging.info(f"Generated video prompt: {video_prompt}")
        
        # Check if Replicate API key is available
        replicate_key = os.environ.get('REPLICATE_API_TOKEN')
        
        if not replicate_key:
            # Return prompt but indicate no API key
            return VideoGenerationResponse(
                status="failed",
                prompt=video_prompt,
                message="Replicate API key not configured. Please add REPLICATE_API_TOKEN to .env file. Get your free key at replicate.com (50 videos/month free tier)."
            )
        
        # Generate video using Replicate (Stable Video Diffusion - established model)
        logging.info("Starting video generation with Replicate...")
        
        # Note: SVD requires an image input, so we'll use a simple text-to-video model instead
        output = await asyncio.to_thread(
            replicate.run,
            "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
            input={
                "prompt": video_prompt,
                "num_frames": 24,
                "num_inference_steps": 50
            }
        )
        
        # output is typically a URL or file path
        video_url = str(output) if output else None
        
        if video_url:
            return VideoGenerationResponse(
                status="completed",
                video_url=video_url,
                prompt=video_prompt,
                message="Video generated successfully!"
            )
        else:
            return VideoGenerationResponse(
                status="failed",
                prompt=video_prompt,
                message="Video generation completed but no output received"
            )
        
    except Exception as e:
        logging.error(f"Video generation failed: {str(e)}")
        return VideoGenerationResponse(
            status="failed",
            prompt=video_prompt if 'video_prompt' in locals() else None,
            message=f"Video generation failed: {str(e)}"
        )

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
        
        system_message = f"""You are an expert AI assistant helping warehouse operators fix robot issues. You're assisting with robot {request.bot_id}.

ROBOT STATUS:
- Bot ID: {request.bot_id}
- Battery: {robot.get('battery', 'Unknown')}%
- Position: X={robot.get('position_x', 'Unknown')}, Y={robot.get('position_y', 'Unknown')}
- Current Task: {robot.get('current_task', 'None')}

ERROR DETAILS:
- Code: {request.error_code}
- Issue: {error['title']}
- Description: {error['description']}

RECOVERY PROCEDURE:
{steps_text}

CRITICAL INSTRUCTIONS:
1. **Track Progress**: Remember what the operator has already tried. Don't repeat the same suggestions.
2. **Be Specific**: Give detailed, actionable instructions with exact locations, tools, and measurements.
3. **Escalate When Needed**: If operator tries 2-3 steps without success, or asks about complex repairs (replacement, calibration, etc.), recommend calling a technician immediately.
4. **Safety First**: Always mention safety precautions for any physical work.
5. **Recognize Skill Level**: Most operators are NOT trained technicians. Complex repairs require expert help.
6. **Be Conversational**: Acknowledge their concerns, ask clarifying questions, provide encouragement.

ESCALATION TRIGGERS:
- Operator tried multiple steps without success
- Asking about component replacement, calibration, or technical procedures
- Issue involves electrical, hydraulic, or complex mechanical work
- Operator seems uncertain or struggling
- Problem persists after basic troubleshooting

When escalating, say: "This issue requires a trained technician. I recommend contacting technical support at [support number] or creating a service ticket. In the meantime, keep the robot powered off for safety."

Be helpful, specific, and know when professional help is needed."""

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