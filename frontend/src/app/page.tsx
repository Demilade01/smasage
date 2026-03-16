"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Wallet, TrendingUp, Target, Activity, CheckCircle2 } from 'lucide-react';

interface Message {
  id: number;
  sender: 'agent' | 'user';
  text: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'agent', text: "Welcome to Smasage! 👋 I'm OpenClaw, your personal AI savings assistant natively built on Stellar. What financial goal can we crush today?" }
  ]);
  const [inputState, setInputState] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [progress, setProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Simulate progress animation on load
  useEffect(() => {
    setTimeout(() => setProgress(68), 500);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputState.trim()) return;

    const userMsg: Message = { id: Date.now(), sender: 'user', text: inputState };
    setMessages(prev => [...prev, userMsg]);
    setInputState('');
    setIsTyping(true);

    // Mock agent response delay
    setTimeout(() => {
      setIsTyping(false);
      const agentMsg: Message = {
        id: Date.now() + 1,
        sender: 'agent',
        text: "That's a great goal. I'll allocate 60% to Stellar Blend for safe yield, and the rest to Soroswap XLM/USDC LP to accelerate returns. Does that sound good?"
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 1800);
  };

  return (
    <main className="app-container">
      {/* Left Panel - Dashboard */}
      <div className="glass-panel">
        <h1>Smasage Portfolio</h1>
        <p className="text-muted" style={{ marginBottom: '2.5rem' }}>
          Real-time on-chain tracking • Stellar Mainnet 🚀
        </p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">
              <Wallet size={16} color="var(--accent-primary)" />
              Total Value
            </div>
            <div className="stat-value">
              $12,450
              <span className="stat-sub">+12.4%</span>
            </div>
          </div>
          <div className="stat-card secondary">
            <div className="stat-label">
              <TrendingUp size={16} color="var(--accent-secondary)" />
              Est. Monthly APY
            </div>
            <div className="stat-value">
              8.5%
              <span className="stat-sub">Active</span>
            </div>
          </div>
        </div>

        <div className="goal-section">
          <div className="goal-header">
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>European Vacation</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Target: $18,000 by Aug 2026</p>
            </div>
            <Target size={32} color="var(--success)" opacity={0.8} />
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            <span>68% Completed</span>
            <span>$5,550 Remaining</span>
          </div>
        </div>

        <div className="allocation-list">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '0.5rem', marginTop: '1rem' }}>
            <Activity size={18} /> Active Strategy Routes
          </h3>

          <div className="allocation-item">
            <div className="allocation-header">
              <span>Blend Protocol Yield (USDC)</span>
              <span>60%</span>
            </div>
            <div className="allocation-bar"><div className="allocation-fill fill-blend" style={{ width: '60%' }}></div></div>
          </div>

          <div className="allocation-item">
            <div className="allocation-header">
              <span>Soroswap LP (XLM/USDC)</span>
              <span>30%</span>
            </div>
            <div className="allocation-bar"><div className="allocation-fill fill-soro" style={{ width: '30%' }}></div></div>
          </div>

          <div className="allocation-item">
            <div className="allocation-header">
              <span>Stellar Anchored Gold (XAUT)</span>
              <span>10%</span>
            </div>
            <div className="allocation-bar"><div className="allocation-fill fill-gold" style={{ width: '10%' }}></div></div>
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Agent */}
      <div className="glass-panel">
        <div className="chat-container">
          <div className="chat-header">
            <div className="agent-avatar">
              <Bot size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>OpenClaw Agent</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--success)' }}>
                <CheckCircle2 size={12} fill="var(--success)" color="var(--bg-card)" /> Online
              </div>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-bubble">{msg.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="message agent">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-container">
            <input
              type="text"
              placeholder="Ask Smasage to adjust goals..."
              value={inputState}
              onChange={(e) => setInputState(e.target.value)}
            />
            <button type="submit" className="send-button">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
