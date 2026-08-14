import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // 1upHealth-inspired palette (demo approximation, not official assets)
        ink: '#0A1733', // deep navy — sidebar, headings
        paper: '#F7F9FC',
        accent: '#2563EB', // 1upHealth-style vivid blue — buttons, links, active
        bad: '#EF4444',
        good: '#10B981'
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};

export default config;
