/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 500: '#f97316',
          600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12',
        },
        canvas: '#ece9e3',
        sand: '#f4f2ec',
        sand2: '#ebe7de',
        line: '#dcd8d0',
        line2: '#c9c4ba',
        ink: '#1a1a1a',
        ink2: '#5c5750',
        ink3: '#787268',
      },
    },
  },
  plugins: [],
}
