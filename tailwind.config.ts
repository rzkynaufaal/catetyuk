import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { rich: "#030B08", panel: "#071710", dgreen: "#0C2A1E", bd: "#006A4E", cg: "#00CC99", line: "#1B4636", mut: "#8FB3A4" }, fontFamily: { sans: ["var(--font-jakarta)", "system-ui", "sans-serif"] } } },
} satisfies Config;
