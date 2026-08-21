import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ── Brand Colours ──────────────────────────── */
      colors: {
        gold: {
          DEFAULT: '#F5A623',
          dark:    '#D4870A',
          light:   '#FBD88A',
          surface: '#FFF8EC',
        },
        ink: {
          DEFAULT: '#0F0E0D',
          80:      '#2D2C2B',
          60:      '#5C5A58',
          40:      '#8C8A87',
          20:      '#C2C0BD',
          10:      '#E0DED9',
          5:       '#F2F0EC',
        },
        surface: {
          DEFAULT: '#F8F7F4',
          card:    '#FFFFFF',
        },
        border: {
          warm: '#E8E4DE',
        },
        success: '#16A34A',
        danger:  '#DC2626',
      },

      /* ── Typography ─────────────────────────────── */
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        urdu:    ['"Noto Nastaliq Urdu"', '"Jameel Noori Nastaleeq"', 'Arial', 'sans-serif'],
      },

      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.05em' }],
        'xs':  ['12px', { lineHeight: '16px' }],
        'sm':  ['14px', { lineHeight: '20px' }],
        'base':['15px', { lineHeight: '22px' }],
        'md':  ['16px', { lineHeight: '24px' }],
        'lg':  ['18px', { lineHeight: '26px' }],
        'xl':  ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
        '5xl': ['48px', { lineHeight: '56px' }],
        '6xl': ['60px', { lineHeight: '68px' }],
        '7xl': ['72px', { lineHeight: '80px' }],
      },

      /* ── Spacing (8pt grid) ─────────────────────── */
      spacing: {
        '4.5':  '18px',
        '5.5':  '22px',
        '6.5':  '26px',
        '7.5':  '30px',
        '13':   '52px',
        '15':   '60px',
        '18':   '72px',
        '22':   '88px',
        '26':   '104px',
        '30':   '120px',
        '34':   '136px',
        '38':   '152px',
        '42':   '168px',
        '46':   '184px',
        '50':   '200px',
      },

      /* ── Border Radius ──────────────────────────── */
      borderRadius: {
        'none':  '0',
        'sm':    '4px',
        'DEFAULT':'6px',
        'md':    '8px',
        'lg':    '12px',
        'xl':    '16px',
        '2xl':   '20px',
        '3xl':   '24px',
        '4xl':   '32px',
        'pill':  '9999px',
      },

      /* ── Shadows ────────────────────────────────── */
      boxShadow: {
        'card':    '0 1px 3px rgba(15, 14, 13, 0.06), 0 1px 2px rgba(15, 14, 13, 0.04)',
        'hover':   '0 8px 24px rgba(15, 14, 13, 0.10), 0 2px 8px rgba(15, 14, 13, 0.06)',
        'float':   '0 20px 60px rgba(15, 14, 13, 0.14)',
        'gold':    '0 4px 20px rgba(245, 166, 35, 0.30)',
        'none':    'none',
      },

      /* ── Transitions ────────────────────────────── */
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },

      /* ── Keyframe Animations ────────────────────── */
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'marquee': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        'count-down': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to:   { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-up':  'fade-up 0.4s ease-out forwards',
        'fade-in':  'fade-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.4,0,0.2,1) forwards',
        'shimmer':  'shimmer 1.5s infinite',
        'marquee':  'marquee 28s linear infinite',
      },

      /* ── Min/Max Heights ────────────────────────── */
      minHeight: {
        'hero-mobile':  '56vw',
        'hero-desktop': '520px',
      },

      /* ── Backdrop Blur ──────────────────────────── */
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
      },
    },
  },
  plugins: [],
};

export default config;
