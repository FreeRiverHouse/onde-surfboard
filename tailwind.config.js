/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Ocean/Surf palette
        'surf-deep': '#0a1628',      // Deep ocean
        'surf-dark': '#0f2744',      // Dark ocean
        'surf-navy': '#1a3a5c',      // Navy blue
        'surf-teal': '#0d9488',      // Teal
        'surf-cyan': '#06b6d4',      // Cyan
        'surf-aqua': '#22d3ee',      // Aqua
        'surf-foam': '#a5f3fc',      // Sea foam
        'surf-gold': '#fbbf24',      // Sunset gold
        'surf-coral': '#f97316',     // Coral sunset
        'surf-white': '#f0fdfa',     // Beach white
        // Legacy Onde colors
        'onde-gold': '#f4d03f',
        'onde-green': '#10b981',
      },
      animation: {
        'wave': 'wave 8s ease-in-out infinite',
        'wave-slow': 'wave 12s ease-in-out infinite',
        'wave-slower': 'wave 16s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateX(0) translateY(0)' },
          '50%': { transform: 'translateX(-25px) translateY(-10px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.5', filter: 'blur(20px)' },
          '50%': { opacity: '0.8', filter: 'blur(40px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'surf-gradient': 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #0d9488 100%)',
        'ocean-gradient': 'linear-gradient(180deg, #0f2744 0%, #0a1628 100%)',
        'sunset-gradient': 'linear-gradient(135deg, #f97316 0%, #fbbf24 50%, #0d9488 100%)',
      },
      boxShadow: {
        'surf-glow': '0 0 40px rgba(6, 182, 212, 0.3)',
        'gold-glow': '0 0 40px rgba(251, 191, 36, 0.3)',
      },
    },
  },
  plugins: [],
}
