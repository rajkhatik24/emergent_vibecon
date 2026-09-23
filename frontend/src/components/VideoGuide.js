import React, { useState } from 'react';
import { Button } from './ui/button';
import './VideoGuide.css';

const VideoGuide = ({ errorCode, errorTitle, recoverySteps }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAIVideoOption, setShowAIVideoOption] = useState(false);

  const getAnimationForError = (errorCode) => {
    // Map error codes to animation types
    const animations = {
      'ERR_001': 'sensor-check',
      'ERR_002': 'battery-charge',
      'ERR_003': 'path-clear',
      'ERR_004': 'motor-cool',
      'ERR_005': 'wifi-reconnect',
      'ERR_006': 'weight-reduce',
      'ERR_007': 'gripper-fix',
      'ERR_008': 'navigation-reset',
      'ERR_009': 'software-update',
      'ERR_010': 'emergency-release',
      'ERR_011': 'scanner-clean',
      'ERR_012': 'charging-dock',
      'ERR_013': 'wheel-clean',
      'ERR_014': 'collision-check',
      'ERR_015': 'task-manage'
    };
    return animations[errorCode] || 'generic-fix';
  };

  const animationType = getAnimationForError(errorCode);

  const playAnimation = () => {
    setIsPlaying(true);
    setCurrentStep(0);
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= recoverySteps.length - 1) {
          clearInterval(interval);
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 4000); // Increased to 4 seconds per step
  };

  const resetAnimation = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  return (
    <div className="video-guide" data-testid="video-guide">
      <div className="video-guide-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <h3>Visual Step Guide</h3>
      </div>

      {/* Animation Canvas */}
      <div className="animation-canvas" data-testid="animation-canvas">
        <div className={`animation-scene ${animationType} ${isPlaying ? 'playing' : ''}`}>
          {/* Robot Illustration */}
          <div className="robot-illustration">
            <svg viewBox="0 0 200 200" className="robot-svg">
              {/* Robot Body */}
              <rect x="60" y="80" width="80" height="90" rx="10" className="robot-body" />
              
              {/* Robot Head */}
              <rect x="70" y="40" width="60" height="40" rx="8" className="robot-head" />
              
              {/* Eyes */}
              <circle cx="85" cy="55" r="6" className="robot-eye" />
              <circle cx="115" cy="55" r="6" className="robot-eye" />
              
              {/* Antenna */}
              <line x1="100" y1="40" x2="100" y2="25" className="robot-antenna" />
              <circle cx="100" cy="22" r="4" className="robot-antenna-tip" />
              
              {/* Arms */}
              <rect x="40" y="90" width="15" height="50" rx="5" className="robot-arm" />
              <rect x="145" y="90" width="15" height="50" rx="5" className="robot-arm" />
              
              {/* Wheels */}
              <circle cx="75" cy="175" r="12" className="robot-wheel" />
              <circle cx="125" cy="175" r="12" className="robot-wheel" />
            </svg>

            {/* Error Indicator */}
            {!isPlaying && (
              <div className="error-indicator" data-testid="error-indicator">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
            )}

            {/* Action Animations */}
            {isPlaying && (
              <div className="action-animation" data-testid="action-animation">
                {animationType === 'sensor-check' && <div className="sensor-pulse"></div>}
                {animationType === 'battery-charge' && <div className="charge-bolt">⚡</div>}
                {animationType === 'motor-cool' && <div className="cooling-fan">❄️</div>}
                {animationType === 'wifi-reconnect' && <div className="wifi-waves">📡</div>}
                {animationType === 'gripper-fix' && <div className="wrench-tool">🔧</div>}
                {animationType === 'scanner-clean' && <div className="cleaning-cloth">🧹</div>}
                {(animationType === 'generic-fix' || !animationType) && <div className="tools">🔧</div>}
              </div>
            )}
          </div>

          {/* Step Indicator */}
          {isPlaying && (
            <div className="step-display" data-testid="step-display">
              <div className="step-number">Step {currentStep + 1}/{recoverySteps.length}</div>
              <div className="step-text">{recoverySteps[currentStep]}</div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isPlaying && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentStep + 1) / recoverySteps.length) * 100}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="video-controls">
        <Button
          onClick={isPlaying ? resetAnimation : playAnimation}
          className="play-btn"
          data-testid="play-animation-btn"
        >
          {isPlaying ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
              Stop Animation
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Play Visual Guide
            </>
          )}
        </Button>

        <Button
          onClick={() => setShowAIVideoOption(!showAIVideoOption)}
          className="ai-video-btn"
          data-testid="ai-video-btn"
          disabled
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 11 18-5v12L3 14v-3z"/>
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
          </svg>
          Generate AI Video
          <span className="coming-soon">Pro</span>
        </Button>
      </div>

      {/* AI Video Info */}
      {showAIVideoOption && (
        <div className="ai-video-info">
          <p>🎬 AI-generated realistic video demonstrations coming soon!</p>
          <p className="info-text">Upgrade to Pro to generate photorealistic video guides using AI.</p>
        </div>
      )}
    </div>
  );
};

export default VideoGuide;