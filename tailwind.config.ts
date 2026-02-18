import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Mode Colors
        dark: {
          bg: '#25292D',
          body: '#EFEFEF',
          header: '#B3B3B3',
        },
        // Light Mode Colors
        light: {
          bg: '#FFFFFF',
          'bg-secondary': '#F5F5F5',
          body: '#1A1A1A',
          header: '#333333',
        },
        // Primary Color (same for both modes)
        primary: {
          DEFAULT: '#6A0DAD',
          50: '#F3E5F9',
          100: '#E1BEE7',
          200: '#CE93D8',
          300: '#BA68C8',
          400: '#AB47BC',
          500: '#6A0DAD',
          600: '#5A0B92',
          700: '#4A0977',
          800: '#3A075C',
          900: '#2A0541',
        },
      },
      fontFamily: {
        payback: ['var(--font-payback)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
export default config;
