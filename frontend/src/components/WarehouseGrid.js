import React, { useEffect, useState } from 'react';
import './WarehouseGrid.css';

const WarehouseGrid = ({ robots }) => {
  const GRID_COLS = 10;
  const GRID_ROWS = 8;
  const CELL_SIZE = 60;

  // Define zones in the warehouse
  const zones = {
    pickingZones: [
      { x: 0, y: 0, label: 'Zone A' },
      { x: 9, y: 0, label: 'Zone B' },
      { x: 0, y: 7, label: 'Zone C' },
      { x: 9, y: 7, label: 'Zone D' }
    ],
    droppingZones: [
      { x: 4, y: 0, label: 'Station 1' },
      { x: 5, y: 0, label: 'Station 2' },
      { x: 4, y: 7, label: 'Station 3' },
      { x: 5, y: 7, label: 'Station 4' }
    ],
    chargingStations: [
      { x: 2, y: 3, label: 'Charger 1' },
      { x: 7, y: 3, label: 'Charger 2' },
      { x: 2, y: 4, label: 'Charger 3' },
      { x: 7, y: 4, label: 'Charger 4' }
    ]
  };

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

  const getZoneType = (x, y) => {
    // Check if position is a picking zone
    if (zones.pickingZones.some(z => z.x === x && z.y === y)) {
      return 'picking-zone';
    }
    // Check if position is a dropping zone
    if (zones.droppingZones.some(z => z.x === x && z.y === y)) {
      return 'dropping-zone';
    }
    // Check if position is a charging station
    if (zones.chargingStations.some(z => z.x === x && z.y === y)) {
      return 'charging-station';
    }
    return '';
  };

  const getZoneLabel = (x, y) => {
    const pickZone = zones.pickingZones.find(z => z.x === x && z.y === y);
    if (pickZone) return pickZone.label;
    
    const dropZone = zones.droppingZones.find(z => z.x === x && z.y === y);
    if (dropZone) return dropZone.label;
    
    const chargeStation = zones.chargingStations.find(z => z.x === x && z.y === y);
    if (chargeStation) return chargeStation.label;
    
    return '';
  };

  // Create grid cells
  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const zoneType = getZoneType(x, y);
        const zoneLabel = getZoneLabel(x, y);
        
        cells.push(
          <div
            key={`${x}-${y}`}
            className={`grid-cell ${zoneType}`}
            data-x={x}
            data-y={y}
          >
            {zoneLabel && <div className="zone-label">{zoneLabel}</div>}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="warehouse-grid-container" data-testid="warehouse-grid">
      <div className="warehouse-header">
        <h3>Warehouse Floor - Live Fleet Movement</h3>
        <div className="grid-info">
          <span className="info-item">🏭 10x8 Grid</span>
          <span className="info-item">🤖 {robots.length} Robots Active</span>
        </div>
      </div>
      
      <div 
        className="warehouse-grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_SIZE}px)`,
        }}
      >
        {/* Grid cells */}
        {renderGrid()}
        
        {/* Robots */}
        {robots.map((robot) => {
          const x = robot.position_x || 0;
          const y = robot.position_y || 0;
          
          return (
            <div
              key={robot.bot_id}
              className={`robot-marker ${robot.status}`}
              data-testid={`robot-marker-${robot.bot_id}`}
              style={{
                left: `${x * CELL_SIZE}px`,
                top: `${y * CELL_SIZE}px`,
                '--status-color': getStatusColor(robot.status),
                '--battery-color': getBatteryColor(robot.battery)
              }}
            >
              <div className="robot-body">
                {/* Robot icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="10" x="3" y="11" rx="2"/>
                  <circle cx="12" cy="5" r="2"/>
                  <path d="M12 7v4"/>
                  <line x1="8" x2="8" y1="16" y2="16"/>
                  <line x1="16" x2="16" y1="16" y2="16"/>
                </svg>
                
                {robot.status === 'error' && (
                  <div className="error-badge-marker">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" x2="12" y1="8" y2="12"/>
                      <line x1="12" x2="12.01" y1="16" y2="16"/>
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Robot info tooltip */}
              <div className="robot-tooltip">
                <div className="tooltip-id">{robot.bot_id}</div>
                <div className="tooltip-status">{robot.status}</div>
                <div className="tooltip-battery">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="16" height="10" x="2" y="7" rx="2" ry="2"/>
                    <line x1="22" x2="22" y1="11" y2="13"/>
                  </svg>
                  {robot.battery}%
                </div>
                {robot.current_task && (
                  <div className="tooltip-task">{robot.current_task}</div>
                )}
              </div>
              
              {/* Direction indicator */}
              {robot.status !== 'error' && robot.status !== 'idle' && (
                <div className="direction-indicator"></div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="grid-legend">
        <div className="legend-group">
          <div className="legend-title">Zones:</div>
          <div className="legend-item">
            <div className="legend-box picking-zone"></div>
            <span>Picking</span>
          </div>
          <div className="legend-item">
            <div className="legend-box dropping-zone"></div>
            <span>Drop-off</span>
          </div>
          <div className="legend-item">
            <div className="legend-box charging-station"></div>
            <span>Charging</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseGrid;