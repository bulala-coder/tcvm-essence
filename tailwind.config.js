/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#17140F',
          soft: '#2A251D',
          faint: '#4A4335',
        },
        paper: {
          DEFAULT: '#EDE6D3',
          warm: '#E4DAC0',
          deep: '#D8CBA8',
        },
        seal: {
          DEFAULT: '#AB3B2A',
          soft: '#C25A44',
        },
        herb: '#9C7A34',
        formula: '#3B5266',
        needle: '#4F6B4A',
      },
      fontFamily: {
        display: ['"Noto Serif TC"', 'serif'],
        body: ['"Noto Serif TC"', 'serif'],
        mono: ['"Noto Sans Mono"', 'monospace'],
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(23,20,15,0.06) 1px, transparent 0)",
      },
      backgroundSize: {
        grain: '18px 18px',
      },
    },
  },
  plugins: [],
}
