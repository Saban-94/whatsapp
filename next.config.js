// next.config.js (Saved for Next.js Migration Reference)
// Note: This project is currently built with Vite for optimal standalone app speed.
// This configuration file is included to satisfy PWA specifications for when you migrate to Next.js.

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'img.icons8.com'],
  },
});
