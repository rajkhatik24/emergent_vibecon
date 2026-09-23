import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RobotGrid from './RobotGrid';
import RobotTable from './RobotTable';
import CopilotPanel from './CopilotPanel';
import { Toaster } from './ui/sonner';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WarehouseDashboard = () => {
  const [robots, setRobots] = useState([]);
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [copilotData, setCopilotData] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch robots
  const fetchRobots = async () => {
    try {
      const response = await axios.get(`${API}/robots`);
      setRobots(response.data);
    } catch (error) {
      console.error('Error fetching robots:', error);
    }
  };

  // Simulate robot states
  const simulateRobots = async () => {
    try {
      await axios.post(`${API}/robots/simulate`);
      await fetchRobots();
    } catch (error) {
      console.error('Error simulating robots:', error);
    }
  };

  // Ask AI Copilot
  const askCopilot = async (robot) => {
    if (!robot.error_code) {
      toast.error('No error to analyze');
      return;
    }

    setLoading(true);
    setSelectedRobot(robot);
    setIsPanelOpen(true);

    try {
      const response = await axios.post(`${API}/copilot/ask`, {
        error_code: robot.error_code,
        bot_id: robot.bot_id
      });
      setCopilotData(response.data);
      toast.success('AI Copilot analysis complete');
    } catch (error) {
      console.error('Error asking copilot:', error);
      toast.error('Failed to get copilot advice');
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = async (botId) => {
    try {
      await axios.post(`${API}/robots/${botId}/clear-error`);
      toast.success('Error cleared successfully');
      await fetchRobots();
      setIsPanelOpen(false);
      setCopilotData(null);
      setSelectedRobot(null);
    } catch (error) {
      console.error('Error clearing error:', error);
      toast.error('Failed to clear error');
    }
  };

  // Auto-simulation every 3 seconds
  useEffect(() => {
    fetchRobots();
    const interval = setInterval(() => {
      simulateRobots();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container" data-testid="warehouse-dashboard">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
            </div>
            <div>
              <h1 className="dashboard-title">Warehouse Robot Fleet</h1>
              <p className="dashboard-subtitle">AI-Powered Monitoring & Support</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <div className="stat-label">Active Robots</div>
              <div className="stat-value">{robots.filter(r => r.status !== 'error').length}/{robots.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Errors</div>
              <div className="stat-value error">{robots.filter(r => r.status === 'error').length}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-content">
        <div className={`main-section ${isPanelOpen ? 'panel-open' : ''}`}>
          {/* Robot Grid Visualization */}
          <section className="content-section">
            <div className="section-header">
              <h2 className="section-title">Fleet Overview</h2>
              <div className="status-legend">
                <div className="legend-item">
                  <span className="legend-dot idle"></span>
                  <span>Idle</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot picking"></span>
                  <span>Picking</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot dropping"></span>
                  <span>Dropping</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot charging"></span>
                  <span>Charging</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot error"></span>
                  <span>Error</span>
                </div>
              </div>
            </div>
            <RobotGrid robots={robots} data-testid="robot-grid" />
          </section>

          {/* Robot Table */}
          <section className="content-section">
            <div className="section-header">
              <h2 className="section-title">Robot Status Details</h2>
            </div>
            <RobotTable 
              robots={robots} 
              onAskCopilot={askCopilot}
              data-testid="robot-table"
            />
          </section>
        </div>

        {/* Copilot Panel */}
        <CopilotPanel
          isOpen={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false);
            setCopilotData(null);
            setSelectedRobot(null);
          }}
          robot={selectedRobot}
          copilotData={copilotData}
          loading={loading}
          onClearError={clearError}
          data-testid="copilot-panel"
        />
      </div>
    </div>
  );
};

export default WarehouseDashboard;