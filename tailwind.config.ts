import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',
        paper: '#F8FAFC',
        accent: '#0EA5E9',
        warn: '#F59E0B',
        bad: '#EF4444',
        good: '#10B981'
      }
    }
  },
  plugins: []
};

export default config;
