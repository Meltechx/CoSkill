interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  gradient: string;
}

export default function StatsCard({ label, value, change, trend, icon, gradient }: StatsCardProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "20px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "border-color 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(168,85,247,0.2)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "14px",
          color: "white",
        }}
      >
        {icon}
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "4px" }}>
        <span style={{ fontSize: "26px", fontWeight: 700, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>
          {value}
        </span>
        {change && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "2px",
              color:
                trend === "up" ? "#4ade80"
                : trend === "down" ? "#f87171"
                : "rgba(255,255,255,0.4)",
            }}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : ""} {change}
          </span>
        )}
      </div>

      {/* Label */}
      <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.38)", fontWeight: 500 }}>
        {label}
      </p>
    </div>
  );
}
