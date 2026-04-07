import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070510",
        neonPink: "#ff3dbb",
        neonCyan: "#21e6ff",
        neonYellow: "#ffe44d",
        neonGreen: "#52ff8f"
      },
      boxShadow: {
        neon: "0 0 24px rgba(33, 230, 255, 0.55), 0 0 44px rgba(255, 61, 187, 0.35)",
        "neon-strong": "0 0 40px rgba(33, 230, 255, 0.9), 0 0 85px rgba(255, 61, 187, 0.65)"
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 24px rgba(33, 230, 255, 0.45), 0 0 45px rgba(255, 61, 187, 0.28)" },
          "50%": { boxShadow: "0 0 30px rgba(33, 230, 255, 0.95), 0 0 65px rgba(255, 61, 187, 0.75)" }
        },
        floatDrift: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "50%": { transform: "translateY(-14px) translateX(8px)" }
        }
      },
      animation: {
        glowPulse: "glowPulse 2.3s ease-in-out infinite",
        floatDrift: "floatDrift 7s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
