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
        ink: '#0B1B3F', // deep navy — sidebar, headings
        paper: '#F5F8FC',
        accent: '#1F6FEB', // 1up vivid blue — buttons, links, active
        brand: '#1F6FEB',
        brandNavy: '#0B1B3F',
        brandAccent: '#16C098', // teal accent
        warn: '#F59E0B',
        bad: '#EF4444',
        good: '#10B981'
      }
    }
  },
  plugins: []
};

export default config;
