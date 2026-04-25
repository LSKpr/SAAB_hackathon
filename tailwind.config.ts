import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Consolas",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        panel: "#0b1320",
        panelBorder: "#1c2a40",
        accent: "#3fc1ff",
        hostile: "#ff4d4d",
        friend: "#3fc1ff",
        unknown: "#ffd24a",
      },
    },
  },
  plugins: [],
} satisfies Config;
