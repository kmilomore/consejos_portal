import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b1526",
        mist: "#eef4fb",
        ocean: "#0f69b4",
        sand: "#ffffff",
        ember: "#ff1d3d",
        pine: "#0f69b4",
      },
      boxShadow: {
        panel: "0 24px 80px rgba(11, 21, 38, 0.14)",
      },
      backgroundImage: {
        "hero-grid": "radial-gradient(circle at top left, rgba(15,105,180,0.14), transparent 30%), radial-gradient(circle at top right, rgba(255,29,61,0.1), transparent 28%), linear-gradient(135deg, #ffffff 0%, #f5f9ff 46%, #edf4fc 100%)",
      },
      fontFamily: {
        sans: ["var(--font-museo-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-museo-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;