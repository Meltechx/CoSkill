interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ReactNode;
}

export default function StatsCard({ label, value, change, trend, icon }: StatsCardProps) {
  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: "6px",
        padding: "16px",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#8b949e";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#30363d";
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "6px",
          background: "#21262d",
          border: "1px solid #30363d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "12px",
          color: "#8b949e",
        }}
      >
        {icon}
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "4px" }}>
        <span style={{ fontSize: "24px", fontWeight: 600, color: "#e6edf3", letterSpacing: "-0.02em", lineHeight: 1 }}>
          {value}
        </span>
        {change && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "2px",
              color:
                trend === "up" ? "#3fb950"
                : trend === "down" ? "#f85149"
                : "#8b949e",
            }}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : ""} {change}
          </span>
        )}
      </div>

      {/* Label */}
      <p style={{ fontSize: "12px", color: "#8b949e", fontWeight: 400 }}>
        {label}
      </p>
    </div>
  );
}
