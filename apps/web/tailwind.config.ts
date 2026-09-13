import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#090A0E',
          secondary: '#0E1015',
          surface: '#13151C',
          elevated: '#1A1D26',
          'elevated-hover': '#222632',
          border: '#232733',
          'border-subtle': '#181A22',
          'border-highlight': 'rgba(255, 255, 255, 0.08)',
          text: '#F4F4F6',
          muted: '#9CA3AF',
          dim: '#606775',
        },
        brand: {
          primary: '#FF5C35',
          'primary-hover': '#E84C25',
          'primary-subtle': 'rgba(255, 92, 53, 0.12)',
          accent: '#FF5C35',
          'accent-hover': '#E84C25',
          success: '#34D399',
          warning: '#FBBF24',
          danger: '#F87171',
        },
      },
      borderRadius: {
        btn: '10px',
        input: '10px',
        card: '14px',
        'card-lg': '18px',
        modal: '16px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 8px 30px -4px rgba(0, 0, 0, 0.5)',
        glow: '0 0 25px -5px rgba(255, 92, 53, 0.25)',
        'glow-subtle': '0 0 15px -3px rgba(255, 92, 53, 0.15)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
    },
  },
  plugins: [],
};

export default config;

