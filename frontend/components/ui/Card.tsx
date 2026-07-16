interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`bg-card rounded-xl border border-border p-6 ${
        hover ? "hover:bg-card-hover hover:border-primary/30 transition-all cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
