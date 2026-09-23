import React, { useState } from 'react';
import { Button } from './ui/button';
import './VideoGuide.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VideoGuide = ({ errorCode, errorTitle, recoverySteps, botId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAIVideoOption, setShowAIVideoOption] = useState(false);
  const [aiVideoStatus, setAiVideoStatus] = useState(null); // null, 'generating', 'completed', 'failed'
  const [aiVideoUrl, setAiVideoUrl] = useState(null);
  const [aiVideoPrompt, setAiVideoPrompt] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

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

  const generateAIVideo = async () => {
    setAiVideoStatus('generating');
    setErrorMessage(null);
    
    try {
      const axios = (await import('axios')).default;
      const response = await axios.post(`${API}/copilot/generate-video`, {
        error_code: errorCode,
        bot_id: botId
      });
      
      if (response.data.status === 'completed') {
        setAiVideoStatus('completed');
        setAiVideoUrl(response.data.video_url);
        setAiVideoPrompt(response.data.prompt);
      } else if (response.data.status === 'failed') {
        setAiVideoStatus('failed');
        setErrorMessage(response.data.message);
        setAiVideoPrompt(response.data.prompt);
      }
    } catch (error) {
      setAiVideoStatus('failed');
      setErrorMessage(error.response?.data?.message || 'Failed to generate video. Please try again.');
      console.error('Video generation error:', error);
    }
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

            {/* Detailed Action Demonstrations */}
            {isPlaying && (
              <div className="action-demonstration" data-testid="action-demo">
                {/* Sensor Check - Show hand checking sensors */}
                {animationType === 'sensor-check' && (
                  <div className="demo-scene">
                    <div className="hand-pointer">👉</div>
                    <div className="sensor-highlight"></div>
                    <div className="check-mark">✓</div>
                  </div>
                )}
                
                {/* Battery Charging - Show plug connecting */}
                {animationType === 'battery-charge' && (
                  <div className="demo-scene">
                    <div className="charging-cable">🔌</div>
                    <div className="electricity-flow">⚡⚡⚡</div>
                    <div className="battery-indicator">
                      <div className="battery-fill"></div>
                    </div>
                  </div>
                )}
                
                {/* Path Clearing - Show obstacle being removed */}
                {animationType === 'path-clear' && (
                  <div className="demo-scene">
                    <div className="obstacle">📦</div>
                    <div className="hand-removing">✋</div>
                    <div className="clear-path">→</div>
                  </div>
                )}
                
                {/* Motor Cooling - Show fan and temperature */}
                {animationType === 'motor-cool' && (
                  <div className="demo-scene">
                    <div className="temperature">🌡️</div>
                    <div className="cooling-fan rotating">💨</div>
                    <div className="temp-down">↓</div>
                  </div>
                )}
                
                {/* WiFi Reconnect - Show signal waves */}
                {animationType === 'wifi-reconnect' && (
                  <div className="demo-scene">
                    <div className="router">📡</div>
                    <div className="signal-waves">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <div className="connected">✓</div>
                  </div>
                )}
                
                {/* Weight Reduction - Show items being removed */}
                {animationType === 'weight-reduce' && (
                  <div className="demo-scene">
                    <div className="weight-scale">⚖️</div>
                    <div className="items-removing">📦 📦</div>
                    <div className="arrow-up">↑</div>
                  </div>
                )}
                
                {/* Gripper Fix - Show gripper opening/closing */}
                {animationType === 'gripper-fix' && (
                  <div className="demo-scene">
                    <div className="gripper-open">✋</div>
                    <div className="wrench">🔧</div>
                    <div className="gripper-fixed">👌</div>
                  </div>
                )}
                
                {/* Navigation Reset - Show compass/direction */}
                {animationType === 'navigation-reset' && (
                  <div className="demo-scene">
                    <div className="compass">🧭</div>
                    <div className="reset-icon">🔄</div>
                    <div className="location-pin">📍</div>
                  </div>
                )}
                
                {/* Software Update - Show download/install */}
                {animationType === 'software-update' && (
                  <div className="demo-scene">
                    <div className="download">⬇️</div>
                    <div className="installing">⚙️</div>
                    <div className="complete">✅</div>
                  </div>
                )}
                
                {/* Emergency Stop - Show button press */}
                {animationType === 'emergency-release' && (
                  <div className="demo-scene">
                    <div className="emergency-button">🔴</div>
                    <div className="hand-press">👆</div>
                    <div className="twist-arrow">↻</div>
                  </div>
                )}
                
                {/* Scanner Clean - Show cleaning action */}
                {animationType === 'scanner-clean' && (
                  <div className="demo-scene">
                    <div className="scanner">📷</div>
                    <div className="cleaning-cloth">🧹</div>
                    <div className="sparkle">✨</div>
                  </div>
                )}
                
                {/* Charging Dock - Show navigation to dock */}
                {animationType === 'charging-dock' && (
                  <div className="demo-scene">
                    <div className="charging-station">🔋</div>
                    <div className="navigation-arrow">→</div>
                    <div className="dock-indicator">⚡</div>
                  </div>
                )}
                
                {/* Wheel Clean - Show wheel and cloth */}
                {animationType === 'wheel-clean' && (
                  <div className="demo-scene">
                    <div className="wheel">⚙️</div>
                    <div className="dirt">💧</div>
                    <div className="cloth">🧽</div>
                  </div>
                )}
                
                {/* Collision Check - Show sensors scanning */}
                {animationType === 'collision-check' && (
                  <div className="demo-scene">
                    <div className="radar">📡</div>
                    <div className="scanning-beam"></div>
                    <div className="safe-icon">✓</div>
                  </div>
                )}
                
                {/* Task Management - Show list organization */}
                {animationType === 'task-manage' && (
                  <div className="demo-scene">
                    <div className="task-list">📋</div>
                    <div className="organize">↕️</div>
                    <div className="priority">⭐</div>
                  </div>
                )}
                
                {/* Generic Fix */}
                {(animationType === 'generic-fix' || !animationType) && (
                  <div className="demo-scene">
                    <div className="tools">🔧</div>
                    <div className="repair">🔨</div>
                    <div className="fixed">✅</div>
                  </div>
                )}
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
          onClick={generateAIVideo}
          className="ai-video-btn"
          data-testid="ai-video-btn"
          disabled={aiVideoStatus === 'generating'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m3 11 18-5v12L3 14v-3z"/>
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
          </svg>
          {aiVideoStatus === 'generating' ? 'Generating...' : 'Generate AI Video'}
          <span className="free-badge">50 Free</span>
        </Button>
      </div>

      {/* AI Video Generation Status */}
      {aiVideoStatus === 'generating' && (
        <div className="ai-video-generating" data-testid="ai-video-generating">
          <div className="generating-spinner"></div>
          <p>🎬 AI is crafting your custom video guide...</p>
          <p className="info-text">This may take 1-2 minutes. The AI is analyzing the error and creating a realistic demonstration video.</p>
        </div>
      )}

      {/* AI Video Player */}
      {aiVideoStatus === 'completed' && aiVideoUrl && (
        <div className="ai-video-player" data-testid="ai-video-player">
          <div className="video-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <h4>AI-Generated Video Guide</h4>
          </div>
          <video 
            controls 
            autoPlay 
            loop
            className="ai-video"
            data-testid="ai-video-element"
          >
            <source src={aiVideoUrl} type="video/mp4" />
            Your browser does not support video playback.
          </video>
          {aiVideoPrompt && (
            <div className="video-prompt-info">
              <strong>AI Prompt:</strong> {aiVideoPrompt}
            </div>
          )}
        </div>
      )}

      {/* AI Video Error */}
      {aiVideoStatus === 'failed' && (
        <div className="ai-video-error" data-testid="ai-video-error">
          <div className="error-icon">⚠️</div>
          <p className="error-title">Video Generation Not Available</p>
          <p className="error-message">{errorMessage}</p>
          {aiVideoPrompt && (
            <div className="prompt-preview">
              <strong>Generated Prompt:</strong>
              <p>{aiVideoPrompt}</p>
            </div>
          )}
          {errorMessage && errorMessage.includes('REPLICATE_API_TOKEN') && (
            <div className="setup-instructions">
              <h5>🎯 Setup Instructions:</h5>
              <ol>
                <li>Go to <a href="https://replicate.com" target="_blank" rel="noopener noreferrer">replicate.com</a></li>
                <li>Sign up for free account (50 videos/month)</li>
                <li>Copy your API token</li>
                <li>Add to backend/.env: <code>REPLICATE_API_TOKEN=your_token</code></li>
                <li>Restart backend and try again!</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoGuide;