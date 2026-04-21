import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#080c10',
        surface: '#0e1419',
        border:  '#1c2333',
        'border-bright': '#2d3a4a',
        'text-muted': '#546e7a',
        'text-dim':   '#37474f',
        green:   '#39d353',
        red:     '#f85149',
        blue:    '#58a6ff',
        yellow:  '#e3b341',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Syne', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;