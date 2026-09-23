import React from 'react';
import { Button } from './ui/button';
import './RobotTable.css';

const RobotTable = ({ robots, onAskCopilot }) => {
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'idle': return 'status-idle';
      case 'picking': return 'status-picking';
      case 'dropping': return 'status-dropping';
      case 'charging': return 'status-charging';
      case 'error': return 'status-error';
      default: return 'status-idle';
    }
  };

  const getBatteryClass = (battery) => {
    if (battery > 50) return 'battery-high';
    if (battery > 20) return 'battery-medium';
    return 'battery-low';
  };

  return (
    <div className="robot-table-container" data-testid="robot-table-container">
      <div className="table-wrapper">
        <table className="robot-table">
          <thead>
            <tr>
              <th>Bot ID</th>
              <th>Status</th>
              <th>Battery</th>
              <th>Current Task</th>
              <th>Error</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {robots.map((robot) => (
              <tr key={robot.bot_id} data-testid={`robot-row-${robot.bot_id}`}>
                <td>
                  <div className="bot-id-cell" data-testid={`table-bot-id-${robot.bot_id}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="10" x="3" y="11" rx="2"/>
                      <circle cx="12" cy="5" r="2"/>
                      <path d="M12 7v4"/>
                    </svg>
                    <span className="bot-id-text">{robot.bot_id}</span>
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(robot.status)}`} data-testid={`table-status-${robot.bot_id}`}>
                    <span className="status-badge-dot"></span>
                    {robot.status}
                  </span>
                </td>
                <td>
                  <div className="battery-cell" data-testid={`table-battery-${robot.bot_id}`}>
                    <div className="battery-bar-wrapper">
                      <div 
                        className={`battery-bar ${getBatteryClass(robot.battery)}`}
                        style={{ width: `${robot.battery}%` }}
                      ></div>
                    </div>
                    <span className="battery-text">{robot.battery}%</span>
                  </div>
                </td>
                <td>
                  <span className="task-text" data-testid={`table-task-${robot.bot_id}`}>
                    {robot.current_task || '—'}
                  </span>
                </td>
                <td>
                  {robot.error_code ? (
                    <div className="error-cell" data-testid={`table-error-${robot.bot_id}`}>
                      <span className="error-code">{robot.error_code}</span>
                      <span className="error-message">{robot.error_message}</span>
                    </div>
                  ) : (
                    <span className="no-error" data-testid={`table-no-error-${robot.bot_id}`}>—</span>
                  )}
                </td>
                <td>
                  <Button
                    onClick={() => onAskCopilot(robot)}
                    disabled={!robot.error_code}
                    className="ask-copilot-btn"
                    data-testid={`ask-copilot-btn-${robot.bot_id}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 6v4"/>
                      <path d="M14 14h-4"/>
                      <path d="M14 18h-4"/>
                      <path d="M14 8h-4"/>
                      <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/>
                      <path d="M18 22V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v17"/>
                    </svg>
                    Ask AI Copilot
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RobotTable;