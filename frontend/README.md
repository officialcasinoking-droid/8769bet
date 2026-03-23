# AI Agent Platform Landing Page

A responsive landing page for an AI Agent platform integrated with Aviator-style crash games, built with React, Tailwind CSS, and Vite.

## Features

- Responsive design that works on desktop, tablet, and mobile
- Interactive hero section with animated plane and live multiplier
- AI Agent features showcase
- Live demo simulator
- Statistics counter
- Promotional banners
- Testimonials section
- Footer with comprehensive links
- Mobile app-inspired design elements from the provided screenshots

## Technology Stack

- React 19
- Vite
- Tailwind CSS
- Framer Motion (for animations)
- React Router DOM

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

- `src/components/` - All UI components
- `src/App.jsx` - Main application component
- `src/index.css` - Global styles and Tailwind directives
- `tailwind.config.cjs` - Tailwind CSS configuration
- `postcss.config.cjs` - PostCSS configuration

## Design Implementation

The landing page follows a three-section structure as requested:

### TOP SECTION
- Sticky navbar with logo, navigation links, balance display, and deposit button
- Hero section with animated plane taking off and live multiplier overlay
- Promo banner with referral offer and announcements

### MID SECTION
- Features grid showcasing AI Agent capabilities
- How it works timeline
- Live demo simulator
- Statistics counter
- Promotional cards

### BOTTOM SECTION
- Testimonials
- Footer with categorized links
- Social media icons
- Legal information

All interactive elements link to appropriate internal pages as specified in the requirements.

## Next Steps for Admin Integration

To connect this to your existing self-hosted admin system:

1. Create a `landing_content` table in your MySQL database
2. Build API endpoints to fetch/save content by section
3. Implement WYSIWYG editor in `/admin/landing` route
4. Add content versioning and publishing controls
5. Connect frontend to fetch content from API on load

## Customization

All text, images, colors, and links can be easily modified by:
- Editing the JSON data in each component
- Or connecting to the admin system as described above

The design incorporates elements from your mobile app screenshots including:
- Vibrant green color scheme (#00FF7F)
- Prominent deposit buttons
- Game category icons
- Jackpot displays
- Promotional banners
- Bottom tab-inspired navigation concepts
