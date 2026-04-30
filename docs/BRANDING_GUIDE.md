# NexTalk Frontend Branding Guide

## Overview
This guide defines the branding, styling, and UI standards for NexTalk frontend.

**Internal Codename**: nextalk (updated for consistency)  
**Public Name**: NexTalk  
**Tagline**: "Global Communication Super-App"

## Color Palette

### Primary Colors
- **Primary Blue**: `#3B82F6` or `bg-blue-500`
- **Primary Dark**: `#1E293B` or `bg-slate-900`
- **Primary Black**: `#06070E` (dark mode)

### Secondary Colors
- **Success Green**: `#10B981` or `bg-emerald-500`
- **Warning Orange**: `#F59E0B` or `bg-amber-500`
- **Error Red**: `#EF4444` or `bg-red-500`
- **Info Purple**: `#8B5CF6` or `bg-violet-500`

### Neutral Colors
- **Light Gray**: `#F3F4F6` or `bg-gray-100`
- **Medium Gray**: `#9CA3AF` or `bg-gray-400`
- **Dark Gray**: `#374151` or `bg-gray-700`

## Typography

### Font Family
- **Primary**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI"
- **Mono**: "Courier New", monospace (for code)

### Font Sizes
- H1: 32px (font-bold)
- H2: 28px (font-bold)
- H3: 24px (font-semibold)
- H4: 20px (font-semibold)
- Body: 16px (font-normal)
- Small: 14px (font-normal)
- Extra Small: 12px (font-normal)

### Line Height
- Headings: 1.2
- Body: 1.5
- Compact: 1.3

## Components

### Buttons
```tsx
// Primary Button (Main actions)
<button className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600">
  Primary Action
</button>

// Secondary Button (Alternative actions)
<button className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">
  Secondary Action
</button>

// Danger Button (Destructive actions)
<button className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600">
  Delete
</button>
```

### Input Fields
```tsx
<input
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Enter text..."
/>
```

### Cards
```tsx
<div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-800">
  {/* Content */}
</div>
```

## Icons & Images

### Icon Library
- Use Heroicons for standard UI icons
- Use custom SVG for brand-specific icons
- Icon size: 24px for standard, 32px for large

### Logo Placement
- Header: 32x32px
- About page: 128x128px
- Loading screen: 256x256px

## Spacing System

Use Tailwind spacing scale:
- xs: 4px (px-1, py-1)
- sm: 8px (px-2, py-2)
- md: 12px (px-3, py-3)
- lg: 16px (px-4, py-4)
- xl: 24px (px-6, py-6)
- 2xl: 32px (px-8, py-8)

## Layout

### Mobile-First Breakpoints
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

### Responsive Design
- Mobile: 100% width
- Tablet (768px+): Max 95% width with padding
- Desktop (1024px+): Max 1200px centered

## Dark Mode

All components must support light and dark modes.

```tsx
// Dark mode class structure
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  {/* Content */}
</div>
```

### Dark Mode Colors
- Background: `#111827` (gray-900)
- Surface: `#1F2937` (gray-800)
- Text Primary: `#F3F4F6` (gray-100)
- Text Secondary: `#D1D5DB` (gray-300)
- Border: `#374151` (gray-700)

## Pages & Sections

### Header/Navigation
- Logo (32px) on left
- Navigation items centered
- User menu on right
- Mobile: Hamburger menu

### Chat/Message Area
- Message list with scrolling
- Input area at bottom (sticky)
- Message status indicators (✓ ✓✓ ✓✓✓)
- Typing indicators

### Profile
- Cover image (400px height)
- Profile picture (120px circle, -60px offset)
- Username (@username) prominent
- Privacy badge indicator
- Bio section
- Interests/tags
- Action buttons (Message, Add Contact, Block, etc.)

### Discover/Search
- Search bar prominent
- Filter options
- Grid or list view of users
- Trending section
- Suggested users

### Settings
- Grouped sections
- Toggle switches for boolean options
- Select dropdowns for choices
- Save/Cancel buttons

## Animations

### Transitions
- All interactions: 150-300ms
- Page transitions: 200-300ms
- Hover effects: 150ms

### Common Animations
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Bounce */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

## Forms

### Input Validation
- Valid: Green border + checkmark
- Invalid: Red border + error message below
- Loading: Gray border + spinner

### Form Layout
- Label above input
- 16px spacing between fields
- Full width on mobile, controlled width on desktop
- Required indicator: `*` in red after label

## Messages

### Message Bubble
- User messages: Blue, right-aligned
- Other messages: Gray, left-aligned
- Status indicator: Next to timestamp
- Reactions: Below message
- Edit/Delete menu: On hover

## Status Indicators

### User Status
- Online: 🟢 Green dot
- Away: 🟡 Yellow dot
- Offline: ⚪ Gray dot
- Invisible: Hidden

### Message Status
- ✓ Sent (gray)
- ✓✓ Delivered (gray)
- ✓✓✓ Seen (blue)
- ⏳ Sending (spinner)
- ❌ Failed (red)

## Accessibility

### WCAG 2.1 AA Compliance
- Color contrast ratio: 4.5:1 for text
- Focus indicators: 3px outline
- Keyboard navigation: Tab order correct
- Alt text: All images
- ARIA labels: Form fields and buttons

### Mobile Accessibility
- Minimum touch target: 44x44px
- Text readable without zoom at 100%
- Color not sole information method

## Loading States

### Loading Spinner
```tsx
<div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
```

### Skeleton Loading
```tsx
<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
```

## Error Handling

### Error Messages
- Clear, user-friendly language
- Actionable suggestions
- Red color (#EF4444)
- Icon: Exclamation circle

### Toast Notifications
- Position: Top-right
- Duration: 3-5 seconds (auto-dismiss)
- Types: Success, Error, Warning, Info
- Max 3 visible at once

## Responsive Breakpoints

### Tablet (768px)
- Larger padding/margins
- 2-column layouts
- Sidebar possible

### Desktop (1024px+)
- 3-column layouts
- Sidebar navigation
- Wide content areas
- 1200px max-width

## Performance

### Image Optimization
- Use WebP format
- Responsive images: srcset
- Lazy loading: loading="lazy"
- Compression: 80-90% quality

### Font Loading
- System fonts first
- Web fonts: WOFF2 format
- Fallback fonts defined
- Load critical fonts early

## Branding Assets

### Logo Files
- `nexttalk-logo.svg` - Main logo
- `nexttalk-icon.png` - App icon
- `nexttalk-icon-maskable.png` - Maskable icon (PWA)
- `nexttalk-banner.png` - Banner (1200x630px)

### Icon Files
- Store in `/public/icons/`
- Use SVG format
- Consistent sizing: 24x24px

## Text Updates (No Code Changes)

### English Text Replacements
- "KongoLove" → "NexTalk"
- "Rencontre" → "Communication"
- "Swipe" → "Discover"
- "Match" → "Connection"

### App Title
- Change in `<title>` tag
- Change in metadata
- Update in headers/titles
- Keep version: "NexTalk v1.0"

---

**Implementation Status**: 🟢 Ready  
**Last Updated**: April 21, 2025
