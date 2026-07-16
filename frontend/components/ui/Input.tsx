import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-slate-400">{label}</label>}
      <input
        className={`px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:outline-none focus:border-indigo-500 text-white ${className}`}
        {...props}
      />
    </div>
  );
}
