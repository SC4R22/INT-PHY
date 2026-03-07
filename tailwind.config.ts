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
        dark: {
          bg: '#25292D',
          body: '#EFEFEF',
          header: '#B3B3B3',
        },
        light: {
          bg: '#FFFFFF',
          'bg-secondary': '#F5F5F5',
          body: '#1A1A1A',
          header: '#333333',
        },
        primary: {
          DEFAULT: '#FF7802',
          50:  '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#FF7802',
          600: '#E56900',
          700: '#BF5900',
          800: '#994800',
          900: '#733600',
        },
      },
      fontFamily: {
        cairo:   ['var(--font-cairo)', 'sans-serif'],
        tajawal: ['var(--font-tajawal)', 'sans-serif'],
        payback: ['var(--font-cairo)', 'sans-serif'],
        inter:   ['var(--font-tajawal)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'brand-gradient': 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)',
        'brand-gradient-diagonal': 'linear-gradient(135deg, #FD1D1D 0%, #FCB045 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
