import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#F5A623",
          dark: "#D4870A",
          light: "#FBD88A",
          surface: "#FFF8EC",
        },
        ink: {
          DEFAULT: "#0F0E0D",
          80: "#2D2C2B",
          60: "#5C5A58",
          40: "#8C8A87",
          20: "#C2C0BD",
          10: "#E0DED9",
          5: "#F2F0EC",
        },
        surface: {
          DEFAULT: "#F8F7F4",
          card: "#FFFFFF",
        },
        success: "#16A34A",
        danger: "#DC2626",
        warning: "#F59E0B",
        info: "#3B82F6",
      },
      fontFamily: {
        body: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 14, 13, 0.06), 0 1px 2px rgba(15, 14, 13, 0.04)",
        hover: "0 8px 24px rgba(15, 14, 13, 0.10), 0 2px 8px rgba(15, 14, 13, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
