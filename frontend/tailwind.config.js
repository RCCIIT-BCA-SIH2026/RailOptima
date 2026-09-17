/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        railway: {
          dark: "#0f172a",
          card: "#1e293b",
          border: "#334155",
          blue: "#1d4ed8",
          sky: "#0284c7",
          amber: "#f59e0b",
          red: "#ef4444",
          green: "#10b981",
        }
      }
    },
  },
  plugins: [],
}
