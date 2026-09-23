# AI Copilot for Warehouse Robots - MVP

A real-time monitoring and AI-powered support system for warehouse robot fleets. Built for a 48-hour hackathon challenge.

## 🎯 Features

### ✅ Fleet Visualization
- **10-robot grid display** showing real-time status with visual indicators
- Color-coded status badges (Idle, Picking, Dropping, Charging, Error)
- Battery level monitoring with visual indicators
- Current task display for each robot
- Error badges with pulsing animations

### ✅ Auto-Simulation
- Robots automatically cycle through pick → drop → charge states
- Random error generation (5% chance per cycle)
- Battery management (drains during work, charges at station)
- Real-time position updates
- Simulation runs every 3 seconds

### ✅ Detailed Status Table
- Comprehensive robot information display
- Bot ID with robot icons
- Visual status badges with real-time updates
- Battery bars with percentage indicators
- Current task tracking
- Error code and message display
- "Ask AI Copilot" button (enabled only for robots with errors)

### ✅ AI Copilot Panel
- Slide-in panel with error analysis
- Robot information display (ID, battery, position)
- Error details (code, title, description)
- **AI-powered guidance** - GPT-4o-mini rephrases technical steps into operator-friendly language
- Step-by-step recovery instructions
- "Mark as Resolved" functionality

### ✅ Error Knowledge Base
- 15 common warehouse robot errors (errors.json)
- Detailed recovery procedures for each error type
- Covers: sensor issues, battery problems, navigation errors, motor issues, communication failures, and more

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19 with React Router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI Integration**: OpenAI GPT-4o-mini via emergentintegrations
- **UI Components**: Shadcn/UI, Lucide React icons
- **Styling**: Custom CSS with modern gradients and animations

### Project Structure
```
/app/
├── backend/
│   ├── server.py           # FastAPI application
│   ├── errors.json         # Knowledge base (15 common errors)
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WarehouseDashboard.js    # Main dashboard
│   │   │   ├── RobotGrid.js             # Grid visualization
│   │   │   ├── RobotTable.js            # Status table
│   │   │   ├── CopilotPanel.js          # AI copilot panel
│   │   │   └── ui/                      # Shadcn components
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB
- Your own Emergent LLM key

### Installation

1. **Backend Setup**
```bash
cd /app/backend
pip install -r requirements.txt
```

2. **Frontend Setup**
```bash
cd /app/frontend
yarn install
```

3. **Environment Configuration**

Copy `backend/.env.example` to `backend/.env` and set your own credentials. Never commit `.env` files.

Backend `.env`:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="warehouse_robots"
CORS_ORIGINS="http://localhost:3000"
EMERGENT_LLM_KEY=YOUR_EMERGENT_LLM_KEY
```

Copy `frontend/.env.example` to `frontend/.env`. Frontend environment variables are public; never put API secrets in them.

Frontend `.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Running the Application

Configure the backend URL for your own deployment.

This is a demo. Before exposing the backend publicly, put authentication and rate limits in front of the paid AI endpoints. CORS is not access control.

The technical documents and recovery instructions included here have not been verified against official manufacturer documentation. Do not use them as authoritative instructions for real hardware.

## 🔌 API Endpoints

### Robot Management
- `GET /api/` - API health check
- `GET /api/robots` - Get all robots
- `GET /api/robots/{bot_id}` - Get specific robot
- `POST /api/robots/simulate` - Trigger simulation step
- `POST /api/robots/{bot_id}/clear-error` - Clear robot error

### AI Copilot
- `POST /api/copilot/ask` - Get AI advice for an error
  ```json
  {
    "error_code": "ERR_001",
    "bot_id": "BOT-001"
  }
  ```

## 🧠 AI Integration

The AI Copilot uses **Emergent LLM Key** to access OpenAI's GPT-4o-mini model through the `emergentintegrations` library.

**How it works:**
1. When an operator clicks "Ask AI Copilot", the error code is sent to the backend
2. Backend retrieves technical recovery steps from errors.json
3. LLM rephrases the steps into operator-friendly, encouraging language
4. Response includes both original technical steps and AI-enhanced guidance

**Example transformation:**
- **Technical**: "Stop the robot immediately using the emergency button"
- **AI-friendly**: "Don't worry! First, let's safely stop the robot by pressing the red emergency button."

## 🎨 Design Highlights

- **Modern, Clean UI** with light color palette
- **Glass-morphism effects** on cards and panels
- **Smooth animations** on hover and state changes
- **Responsive layout** adapts to different screen sizes
- **Real-time updates** without page refresh
- **Status-based color coding** for instant visual feedback
- **Accessibility** with proper ARIA labels and semantic HTML

## 📊 Error Types Covered

1. **ERR_001** - Sensor Malfunction
2. **ERR_002** - Low Battery Critical
3. **ERR_003** - Path Obstruction Detected
4. **ERR_004** - Motor Overheating
5. **ERR_005** - Communication Lost
6. **ERR_006** - Payload Overload
7. **ERR_007** - Gripper Malfunction
8. **ERR_008** - Navigation Error
9. **ERR_009** - Software Update Required
10. **ERR_010** - Emergency Stop Activated
11. **ERR_011** - Barcode Scanner Failure
12. **ERR_012** - Charging Station Occupied
13. **ERR_013** - Wheel Slippage Detected
14. **ERR_014** - Collision Avoidance Alert
15. **ERR_015** - Task Queue Overflow

## ✅ Testing

Comprehensive automated testing performed:
- ✅ Backend API endpoints (100% pass rate)
- ✅ Frontend UI components (100% pass rate)
- ✅ Auto-simulation functionality
- ✅ AI Copilot integration
- ✅ Error handling and edge cases
- ✅ Real-time updates

Test reports available in `/app/test_reports/`

## 🎯 MVP Success Criteria

✅ Shows simulated fleet of 10 robots in grid  
✅ Displays table with Bot ID, Status, Error, and "Ask AI Copilot" button  
✅ Right-side Copilot panel with error explanation and recovery steps  
✅ Reads fixes from errors.json knowledge base (15 errors)  
✅ LLM integration to rephrase steps in operator-friendly language  
✅ Auto-simulation with pick → drop → charge cycle  
✅ Random error generation  
✅ Clean, modern design  

## 🚧 Hackathon Notes

This is an MVP built for demonstration purposes. For production use, consider:
- WebSocket connections for real-time updates (currently using polling)
- Enhanced error recovery workflows
- Robot command execution capabilities
- Historical data and analytics
- Multi-warehouse support
- Role-based access control
- Performance optimizations for larger fleets

---

**Made with Emergent** 🤖
