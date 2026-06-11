/**
 * PostCSS pipeline: Tailwind v4 runs entirely through its PostCSS plugin —
 * no tailwind.config file is needed; tokens live in app/globals.css.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
