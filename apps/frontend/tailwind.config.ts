import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Sora", "sans-serif"],
        body: ["Manrope", "sans-serif"]
      },
      colors: {
        abyss: "#06070e",
        neoblue: "#32b8ff",
        neoviolet: "#835bff",
        neopink: "#ff3cac",
        neogreen: "#39ff14",
        neocyan: "#00fff5",
        gold: "#f4c067",
        danger: "#ff4d4f",
        surface: {
          DEFAULT: "rgba(10, 15, 32, 0.85)",
          hover: "rgba(20, 28, 55, 0.9)"
        }
      },
      boxShadow: {
        neon: "0 0 30px rgba(50, 184, 255, 0.25)",
        "neon-lg": "0 0 60px rgba(50, 184, 255, 0.35), 0 0 20px rgba(50, 184, 255, 0.2)",
        "neon-violet": "0 0 30px rgba(131, 91, 255, 0.4)",
        "neon-pink": "0 0 30px rgba(255, 60, 172, 0.4)",
        "neon-gold": "0 0 30px rgba(244, 192, 103, 0.4)",
        card: "0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
      },
      backgroundImage: {
        pulse: "radial-gradient(circle at 15% 20%, rgba(50,184,255,0.2), transparent 45%), radial-gradient(circle at 80% 10%, rgba(131,91,255,0.2), transparent 45%), linear-gradient(180deg, #06070e 0%, #0b1020 100%)",
        "neon-card": "linear-gradient(135deg, rgba(50,184,255,0.05) 0%, rgba(131,91,255,0.05) 100%)",
        "gradient-neon": "linear-gradient(135deg, #32b8ff 0%, #835bff 100%)",
        "gradient-pink": "linear-gradient(135deg, #ff3cac 0%, #835bff 100%)",
        "gradient-gold": "linear-gradient(135deg, #f4c067 0%, #ff3cac 100%)"
      },
      animation: {
        "pulse-neon": "pulseNeon 2.5s ease-in-out infinite",
        "glow": "glow 3s ease-in-out infinite alternate",
        "slide-up": "slideUp 0.4s ease",
        "fade-in": "fadeIn 0.3s ease",
        "spin-slow": "spin 6s linear infinite"
      },
      keyframes: {
        pulseNeon: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(50,184,255,0.3)" },
          "50%": { boxShadow: "0 0 50px rgba(50,184,255,0.7), 0 0 80px rgba(131,91,255,0.3)" }
        },
        glow: {
          from: { textShadow: "0 0 10px rgba(50,184,255,0.5)" },
          to: { textShadow: "0 0 20px rgba(50,184,255,1), 0 0 40px rgba(131,91,255,0.6)" }
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" }
        }
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem"
      }
    }
  },
  plugins: []
};

export default config;
