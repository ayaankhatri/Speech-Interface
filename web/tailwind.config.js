export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        handjet: ['Handjet', 'monospace'],
      },
      colors: {
        "screen-tint": "#1b1b1b",
        "status-green": "#59eb30",
        "status-green-edge": "#3a6e2b",
        "status-red": "#eb3838",
        "status-red-edge": "#7a2020",
      },
      borderWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};
