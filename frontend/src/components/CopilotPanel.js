import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import axios from 'axios';
import './CopilotPanel.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CopilotPanel = ({ isOpen, onClose, robot, copilotData, loading, onClearError }) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const chatEndRef = useRef(null);

  // Reset chat when panel opens with new robot
  useEffect(() => {
    if (isOpen && robot) {
      setChatMessages([]);
      setSessionId(null);
    }
  }, [isOpen, robot?.bot_id]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !robot || !copilotData) return;

    const userMessage = chatInput.trim();
    setChatInput('');

    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await axios.post(`${API}/copilot/chat`, {
        message: userMessage,
        bot_id: robot.bot_id,
        error_code: copilotData.error_code,
        session_id: sessionId
      });

      // Update session ID for conversation continuity
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }

      // Add AI response to chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="copilot-overlay" onClick={onClose} data-testid="copilot-overlay"></div>
      <div className={`copilot-panel ${isOpen ? 'open' : ''}`} data-testid="copilot-panel">
        <div className="copilot-header">
          <div className="copilot-header-content">
            <div className="copilot-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h-2a5 5 0 0 0-5-5h-1v1.27c.6.34 1 .99 1 1.73 0 1.1-.9 2-2 2s-2-.9-2-2c0-.74.4-1.39 1-1.73V9H9a5 5 0 0 0-5 5H2a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                <path d="M7 14a5 5 0 0 0 5 5 5 5 0 0 0 5-5"/>
                <path d="M12 19v3"/>
              </svg>
            </div>
            <div>
              <h2 className="copilot-title">AI Copilot</h2>
              <p className="copilot-subtitle">Intelligent Error Analysis</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} data-testid="close-copilot-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="copilot-body">
          {loading ? (
            <div className="copilot-loading" data-testid="copilot-loading">
              <div className="loading-spinner"></div>
              <p>Analyzing error and generating recovery steps...</p>
            </div>
          ) : copilotData ? (
            <>
              {/* Robot Info */}
              <div className="info-card" data-testid="robot-info-card">
                <div className="info-card-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="10" x="3" y="11" rx="2"/>
                    <circle cx="12" cy="5" r="2"/>
                    <path d="M12 7v4"/>
                  </svg>
                  <h3>Robot Information</h3>
                </div>
                <div className="robot-details">
                  <div className="detail-row">
                    <span className="detail-label">Bot ID:</span>
                    <span className="detail-value" data-testid="copilot-robot-id">{robot?.bot_id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Battery:</span>
                    <span className="detail-value" data-testid="copilot-robot-battery">{robot?.battery}%</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Position:</span>
                    <span className="detail-value" data-testid="copilot-robot-position">X: {robot?.position_x}, Y: {robot?.position_y}</span>
                  </div>
                </div>
              </div>

              {/* Error Info */}
              <div className="error-card" data-testid="error-info-card">
                <div className="error-card-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" x2="12" y1="8" y2="12"/>
                    <line x1="12" x2="12.01" y1="16" y2="16"/>
                  </svg>
                  <div>
                    <span className="error-code" data-testid="copilot-error-code">{copilotData.error_code}</span>
                    <h3 className="error-title" data-testid="copilot-error-title">{copilotData.title}</h3>
                  </div>
                </div>
                <p className="error-description" data-testid="copilot-error-description">{copilotData.description}</p>
              </div>

              {/* AI Explanation */}
              {copilotData.llm_explanation && (
                <div className="ai-explanation" data-testid="ai-explanation">
                  <div className="ai-explanation-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m3 11 18-5v12L3 14v-3z"/>
                      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                    </svg>
                    <h3>AI Copilot Guidance</h3>
                  </div>
                  <div className="ai-content" data-testid="ai-explanation-content">
                    {copilotData.llm_explanation}
                  </div>
                </div>
              )}

              {/* Recovery Steps */}
              <div className="recovery-steps" data-testid="recovery-steps">
                <div className="steps-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="9" x2="15" y1="13" y2="13"/>
                    <line x1="9" x2="15" y1="17" y2="17"/>
                  </svg>
                  <h3>Recovery Steps</h3>
                </div>
                <ol className="steps-list">
                  {copilotData.recovery_steps.map((step, index) => (
                    <li key={index} className="step-item" data-testid={`recovery-step-${index}`}>
                      <span className="step-number">{index + 1}</span>
                      <span className="step-text">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Chat Interface */}
              <div className="chat-section" data-testid="chat-section">
                <div className="chat-header">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <h3>Ask Follow-up Questions</h3>
                </div>

                {/* Chat messages */}
                {chatMessages.length > 0 && (
                  <div className="chat-messages" data-testid="chat-messages">
                    {chatMessages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`chat-message ${msg.role}`}
                        data-testid={`chat-message-${msg.role}-${index}`}
                      >
                        <div className="message-avatar">
                          {msg.role === 'user' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h-2a5 5 0 0 0-5-5h-1v1.27c.6.34 1 .99 1 1.73 0 1.1-.9 2-2 2s-2-.9-2-2c0-.74.4-1.39 1-1.73V9H9a5 5 0 0 0-5 5H2a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                            </svg>
                          )}
                        </div>
                        <div className="message-content">
                          <div className="message-role">{msg.role === 'user' ? 'You' : 'AI Copilot'}</div>
                          <div className="message-text">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="chat-message assistant" data-testid="chat-loading">
                        <div className="message-avatar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h-2a5 5 0 0 0-5-5h-1v1.27c.6.34 1 .99 1 1.73 0 1.1-.9 2-2 2s-2-.9-2-2c0-.74.4-1.39 1-1.73V9H9a5 5 0 0 0-5 5H2a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                          </svg>
                        </div>
                        <div className="message-content">
                          <div className="message-role">AI Copilot</div>
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* Chat input */}
                <div className="chat-input-wrapper">
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="Ask a question... (e.g., 'What if step 1 doesn't work?')"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={chatLoading}
                    data-testid="chat-input"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || chatLoading}
                    className="chat-send-btn"
                    data-testid="chat-send-btn"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="copilot-actions">
                <Button
                  onClick={() => onClearError(robot?.bot_id)}
                  className="clear-error-btn"
                  data-testid="clear-error-btn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Mark as Resolved
                </Button>
              </div>
            </>
          ) : (
            <div className="copilot-empty" data-testid="copilot-empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h-2a5 5 0 0 0-5-5h-1v1.27c.6.34 1 .99 1 1.73 0 1.1-.9 2-2 2s-2-.9-2-2c0-.74.4-1.39 1-1.73V9H9a5 5 0 0 0-5 5H2a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              </svg>
              <p>Select a robot with an error to get AI assistance</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CopilotPanel;