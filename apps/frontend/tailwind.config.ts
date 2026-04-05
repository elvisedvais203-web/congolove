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
        gold: "#f4c067"
      },
      boxShadow: {
        neon: "0 0 30px rgba(50, 184, 255, 0.25)"
      },
      backgroundImage: {
        pulse: "radial-gradient(circle at 15% 20%, rgba(50,184,255,0.2), transparent 45%), radial-gradient(circle at 80% 10%, rgba(131,91,255,0.2), transparent 45%), linear-gradient(180deg, #06070e 0%, #0b1020 100%)"
      }
    }
  },
  plugins: []
};

export default config;
