import React from 'react';
import './RobotGrid.css';

const RobotGrid = ({ robots }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'idle': return '#94a3b8';
      case 'picking': return '#3b82f6';
      case 'dropping': return '#8b5cf6';
      case 'charging': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getBatteryColor = (battery) => {
    if (battery > 50) return '#10b981';
    if (battery > 20) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="robot-grid-container" data-testid="robot-grid-container">
      <div className="grid-wrapper">
        {robots.map((robot) => (
          <div
            key={robot.bot_id}
            className={`robot-card ${robot.status}`}
            data-testid={`robot-card-${robot.bot_id}`}
            style={{
              '--status-color': getStatusColor(robot.status),
              '--battery-color': getBatteryColor(robot.battery)
            }}
          >
            <div className="robot-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="10" x="3" y="11" rx="2"/>
                <circle cx="12" cy="5" r="2"/>
                <path d="M12 7v4"/>
                <line x1="8" x2="8" y1="16" y2="16"/>
                <line x1="16" x2="16" y1="16" y2="16"/>
              </svg>
              {robot.status === 'error' && (
                <div className="error-badge" data-testid={`error-badge-${robot.bot_id}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" x2="12" y1="8" y2="12"/>
                    <line x1="12" x2="12.01" y1="16" y2="16"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="robot-info">
              <div className="robot-id" data-testid={`robot-id-${robot.bot_id}`}>{robot.bot_id}</div>
              <div className="robot-status" data-testid={`robot-status-${robot.bot_id}`}>
                <span className="status-dot"></span>
                {robot.status}
              </div>
              <div className="robot-battery" data-testid={`robot-battery-${robot.bot_id}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="16" height="10" x="2" y="7" rx="2" ry="2"/>
                  <line x1="22" x2="22" y1="11" y2="13"/>
                </svg>
                {robot.battery}%
              </div>
              {robot.current_task && (
                <div className="robot-task" data-testid={`robot-task-${robot.bot_id}`}>{robot.current_task}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RobotGrid;