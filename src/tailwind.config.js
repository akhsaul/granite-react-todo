/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  // TailwindCSS v4 uses class-based dark mode by default
  // No need to specify darkMode: 'class' as it's the default
  theme: {
    extend: {},
  },
  plugins: [],
};
