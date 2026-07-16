import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080808",
        card: "#1a1a1a",
        "card-hover": "#222222",
        border: "#2a2a2a",
        primary: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
          muted: "#4f46e5",
        },
        muted: "#888888",
      },
    },
  },
  plugins: [],
};
export default config;
