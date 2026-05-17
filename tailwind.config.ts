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
        brand: '#2563EB',
        brandNavy: '#0A1733',
        brandAccent: '#15B79E', // teal accent
        warn: '#F59E0B',
        bad: '#EF4444',
        good: '#10B981'
      }
    }
  },
  plugins: []
};

export default config;
