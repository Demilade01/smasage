"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Bot,
  Send,
  Target,
  Activity,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PortfolioStats } from "./components/PortfolioStats";
import {
  evaluateGoalStatus,
  getStatusColor,
  type GoalData,
} from "../utils/goalProjection";
import PortfolioChart from "./PortfolioChart";
import {
  parseAllocationsFromMessage,
  getDefaultAllocations,
} from "../utils/allocationParser";
import type { AssetAllocation } from "../utils/chartUtils";
import { useNotifications } from "../hooks/useNotifications";
import { DashboardHeader } from "./components/DashboardHeader";
import { ConnectWalletButton } from "./components/ConnectWalletButton";
import { useFreighter } from "../hooks/useFreighter";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  PortfolioStatsSkeleton,
  GoalTrackerSkeleton,
  PortfolioChartSkeleton,
} from "./components/SkeletonLoader";
import { WalletModal } from "./components/WalletModal";

interface Message {
  id: number;
  sender: "agent" | "user";
  text: string;
  proactive?: boolean;
  timestamp?: string;
}

export default function Home() {
  const { 
    publicKey, 
    connect, 
    showInstallModal, 
    setShowInstallModal,
    isConnecting 
  } = useFreighter();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "agent",
      text: "Welcome to Smasage! 👋 I'm OpenClaw, your personal AI savings assistant natively built on Stellar. What financial goal can we crush today?",
    },
  ]);
  const [inputState, setInputState] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [allocations, setAllocations] = useState<AssetAllocation[]>(
    getDefaultAllocations(),
  );

  const [wsConnected, setWsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Goal data (Memoized to avoid unnecessary effect triggers)
  const goalData = useMemo<GoalData>(() => ({
    currentBalance: 12450,
    targetAmount: 18000,
    targetDate: "2026-08-01",
    monthlyContribution: 500,
    expectedAPY: 8.5,
  }), []);

  // Calculate goal status and progress using useMemo to avoid cascading renders
  const { goalStatus, progress } = useMemo(() => {
    const result = evaluateGoalStatus(goalData);
    return {
      goalStatus: result.status,
      progress: result.progressPercentage,
    };
  }, [goalData]);

  // WebSocket notifications
  const { registerGoal } = useNotifications({
    userId: "user-demo-001",
    onNotification: (notification) => {
      if (notification.type === "connected") {
        console.log("[App] Connected to notification server");
        setWsConnected(true);
        setIsLoading(false);
      } else if (notification.type === "agent-message") {
        const payload = notification.payload as { text: string; proactive?: boolean; timestamp?: string };
        const agentMsg: Message = {
          id: Date.now(),
          sender: "agent",
          text: payload.text,
          proactive: payload.proactive,
          timestamp: payload.timestamp,
        };
        setMessages((prev) => [...prev, agentMsg]);

        // Parse allocations if present
        const parsedAllocations = parseAllocationsFromMessage(payload.text);
        if (parsedAllocations) {
          setAllocations(parsedAllocations);
        }
      }
    },
    onError: (error) => {
      console.error("[App] WebSocket error:", error);
    },
    enabled: true,
  });

  // Fallback: stop loading after 3s even if WS hasn't connected
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Register goal with notification server on mount
  useEffect(() => {
    if (wsConnected) {
      registerGoal({
        currentBalance: goalData.currentBalance,
        targetAmount: goalData.targetAmount,
        targetDate: goalData.targetDate,
        expectedAPY: goalData.expectedAPY,
        monthlyContribution: goalData.monthlyContribution,
      });
    }
  }, [wsConnected, registerGoal, goalData]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputState.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      sender: "user",
      text: inputState,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputState("");
    setIsTyping(true);

    // Mock agent response delay
    setTimeout(() => {
      setIsTyping(false);
      const agentMsg: Message = {
        id: Date.now() + 1,
        sender: "agent",
        text: "That's a great goal. I'll allocate 60% to Stellar Blend for safe yield, and the rest to Soroswap XLM/USDC LP to accelerate returns. Does that sound good?",
      };
      setMessages((prev) => [...prev, agentMsg]);

      // Parse allocations from agent message
      const parsedAllocations = parseAllocationsFromMessage(agentMsg.text);
      if (parsedAllocations) {
        setAllocations(parsedAllocations);
      }
    }, 1800);
  };

  return (
    <ErrorBoundary fallbackMessage="The dashboard failed to load. Please try again.">
      <>
        <DashboardHeader wsConnected={wsConnected}>
          <ConnectWalletButton
            onClick={connect}
            publicKey={publicKey || undefined}
            isConnecting={isConnecting}
          />
        </DashboardHeader>

        <WalletModal
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
        />
        <main className="app-container">
          {/* Left Panel - Dashboard */}
          <div className="glass-panel">
            <h1>Smasage Portfolio</h1>
            <p className="text-muted" style={{ marginBottom: "2.5rem" }}>
              Real-time on-chain tracking • Stellar Mainnet 🚀
            </p>

            {isLoading ? (
              <PortfolioStatsSkeleton />
            ) : (
              <div className="skeleton-fade-in">
                <PortfolioStats
                  totalValue={goalData.currentBalance}
                  apy={goalData.expectedAPY}
                  valueChange={12.4}
                />
              </div>
            )}

            {isLoading ? (
              <GoalTrackerSkeleton />
            ) : (
              <div className="goal-section skeleton-fade-in">
                <div className="goal-header">
                  <div>
                    <h3 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>
                      European Vacation
                    </h3>
                    <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                      Target: $18,000 by Aug 2026
                    </p>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: getStatusColor(goalStatus),
                        fontWeight: 600,
                        marginTop: "4px",
                      }}
                    >
                      Status: {goalStatus}
                    </p>
                  </div>
                  <Target
                    size={32}
                    color={getStatusColor(goalStatus)}
                    opacity={0.8}
                  />
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  <span>68% Completed</span>
                  <span>$5,550 Remaining</span>
                </div>
              </div>
            )}

            <div className="allocation-list">
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "1.1rem",
                  marginBottom: "1.25rem",
                  marginTop: "1rem",
                }}
              >
                <Activity size={18} /> Active Strategy Routes
              </h3>

              {isLoading ? (
                <PortfolioChartSkeleton />
              ) : (
                <div className="skeleton-fade-in">
                  <PortfolioChart
                    allocations={allocations}
                    width={320}
                    height={280}
                    showLegend={true}
                    animated={true}
                  />
                </div>
              )}
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
                  <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
                    OpenClaw Agent
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.85rem",
                      color: "var(--success)",
                    }}
                  >
                    <CheckCircle2
                      size={12}
                      fill="var(--success)"
                      color="var(--bg-card)"
                    />{" "}
                    Online
                  </div>
                </div>
              </div>

              <div className="chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`message ${msg.sender}`}>
                    {msg.proactive && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "0.75rem",
                          color: "var(--accent-primary)",
                          marginBottom: "4px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        <AlertCircle size={12} /> Proactive Nudge
                      </div>
                    )}
                    <div className="message-bubble">{msg.text}</div>
                  </div>
                ))}
                {isTyping && (
                  <div className="message agent">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="chat-input-container"
              >
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
      </>
    </ErrorBoundary>
  );
}
