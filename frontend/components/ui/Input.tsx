"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-sm text-muted">{label}</label>}
        <input
          ref={ref}
          className={`w-full px-4 py-2.5 rounded-lg bg-card border border-border text-white placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500/50" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
