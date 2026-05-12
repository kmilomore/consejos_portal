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
        /* Brand primaries */
        navy:  {
          DEFAULT: "#25306B",
          50:  "#EEF0F7",
          100: "#D4D8E9",
          200: "#A9B1D2",
          300: "#7B85B6",
          400: "#525E96",
          500: "#25306B",
          600: "#1F2A5E",
          700: "#182250",
          800: "#131B40",
          900: "#0C122C",
        },
        royal: {
          DEFAULT: "#006BB9",
          50:  "#E5F2FB",
          100: "#BFDEF4",
          200: "#8FC4EA",
          300: "#56A6DE",
          400: "#208ECF",
          500: "#006BB9",
          600: "#005FA5",
          700: "#004F8A",
          800: "#003E6C",
          900: "#002A4C",
        },
        coral: {
          DEFAULT: "#FF1D3D",
          50:  "#FFE5E9",
          100: "#FFC1C9",
          200: "#FF8E9D",
          300: "#FF5C73",
          400: "#FF3855",
          500: "#FF1D3D",
          600: "#E5142F",
          700: "#BD0E25",
          800: "#94081B",
          900: "#6C0413",
        },
        neutral: {
          0:   "#FFFFFF",
          50:  "#F7F9FC",
          100: "#EDF0F5",
          200: "#DDE3EC",
          300: "#C2CAD7",
          400: "#97A0B2",
          500: "#6A7388",
          600: "#4A5266",
          700: "#323A4D",
          800: "#1F2638",
          900: "#11162A",
        },
        /* Semantic aliases (backwards compat with existing Tailwind classes) */
        ink:   "#25306B",
        mist:  "#EDF0F5",
        ocean: "#006BB9",
        ember: "#FF1D3D",
      },
      boxShadow: {
        xs:    "0 1px 2px rgba(37,48,107,0.06)",
        sm:    "0 2px 6px rgba(37,48,107,0.08)",
        md:    "0 6px 18px rgba(37,48,107,0.10)",
        lg:    "0 16px 40px rgba(37,48,107,0.14)",
        xl:    "0 28px 64px rgba(37,48,107,0.18)",
        focus: "0 0 0 3px rgba(0,107,185,0.35)",
        /* legacy */
        panel: "0 24px 80px rgba(37,48,107,0.14)",
      },
      backgroundImage: {
        "grad-navy":      "linear-gradient(135deg,#25306B 0%,#2C3D9E 100%)",
        "grad-deep-blue": "linear-gradient(135deg,#25306B 0%,#006BB9 100%)",
        "grad-hero":      "linear-gradient(140deg,#25306B 0%,#1F2A5E 45%,#006BB9 100%)",
        "grad-red-fade":  "linear-gradient(135deg,#FF1D3D 0%,#EDF0F5 100%)",
      },
      fontFamily: {
        sans:    ["var(--font-museo-sans)", "Avenir Next", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["var(--font-museo-sans)", "Avenir Next", "Segoe UI", "sans-serif"],
        mono:    ["ui-monospace", "SF Mono", "Cascadia Mono", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        control: "8px",
        card:    "12px",
        pill:    "999px",
      },
    },
  },
  plugins: [],
};

export default config;
