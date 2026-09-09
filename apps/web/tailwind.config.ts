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
          bg: '#0A0A0A',
          secondary: '#0D0D0D',
          surface: '#111111',
          elevated: '#171717',
          border: '#292929',
          'border-subtle': '#1D1D1D',
          text: '#F1F0EA',
          muted: '#A3A3A3',
          dim: '#6F6F6F',
        },
        brand: {
          primary: '#FF5C35',
          'primary-hover': '#E94B27',
          accent: '#FF5C35',
          'accent-hover': '#E94B27',
          success: '#5DBB8A',
          warning: '#D6A84B',
          danger: '#E05252',
        },
      },
      borderRadius: {
        btn: '8px',
        input: '8px',
        card: '8px',
        modal: '10px',
      },
    },
  },
  plugins: [],
};

export default config;

