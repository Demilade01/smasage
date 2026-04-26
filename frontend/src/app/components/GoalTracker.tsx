import { Target } from "lucide-react";
import { getStatusColor, type ProjectionResult } from "../../utils/goalProjection";

export interface GoalTrackerProps {
  goalName: string;
  targetAmount: number;
  targetDate: string;
  status: ProjectionResult["status"];
  progressPercentage: number;
  remainingAmount: number;
}

function getStatusClass(status: ProjectionResult["status"]): string {
  switch (status) {
    case "Ahead":
      return "ahead";
    case "On Track":
      return "on-track";
    case "Falling Behind":
      return "falling-behind";
    default:
      return "on-track";
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTargetDate(targetDate: string): string {
  const parsed = new Date(targetDate);
  if (Number.isNaN(parsed.getTime())) {
    return targetDate;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function GoalTracker({
  goalName,
  targetAmount,
  targetDate,
  status,
  progressPercentage,
  remainingAmount,
}: GoalTrackerProps) {
  const statusColor = getStatusColor(status);
  const clampedProgress = Math.max(0, Math.min(100, progressPercentage));

  return (
    <div className="goal-section skeleton-fade-in">
      <div className="goal-header">
        <div>
          <h3 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>{goalName}</h3>
          <p className="text-muted" style={{ fontSize: "0.9rem" }}>
            Target: {formatCurrency(targetAmount)} by {formatTargetDate(targetDate)}
          </p>
          <div className={`status-indicator ${getStatusClass(status)}`}>
            Status: {status}
          </div>
        </div>
        <Target size={32} color={statusColor} opacity={0.8} />
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(clampedProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Savings goal progress"
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
        <span>{Math.round(clampedProgress)}% Completed</span>
        <span>{formatCurrency(remainingAmount)} Remaining</span>
      </div>
    </div>
  );
}
