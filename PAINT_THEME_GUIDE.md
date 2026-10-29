# Paint the Theme: Interactive Theme Switcher

## Overview

The "Paint the Theme" feature is an interactive, animated theme switcher that replaces the static theme toggle with a dynamic, gesture-driven interface. It provides multiple ways to change your SourcePilot theme with visual feedback, keyboard shortcuts, and theme preview capabilities.

## Features

### 1. **Paint Mode Activation**
- Click the paintbrush button to enter Paint Mode
- Visual feedback: button highlights in accent color with a glow effect
- Keyboard shortcut: Press **Esc** to exit Paint Mode at any time

### 2. **Spring Physics Cursor**
When Paint Mode is active:
- A spring-animated ring cursor follows your mouse with physics-based damping
- Center dot cursor shows the exact pointer position
- Respects `prefers-reduced-motion` for accessibility
- Smooth animations with `requestAnimationFrame` for 60fps performance

### 3. **Keyboard Shortcuts (Paint Mode)**
- **L** - Switch to Light Theme
- **D** - Switch to Dark Theme
- **S** - Switch to System Theme (follows OS preference)
- **Esc** - Exit Paint Mode

### 4. **Theme Peek Window**
- Hover over Light/Dark options in the menu to see a preview
- Shows emoji (☀️ for light, 🌙 for dark) and theme name
- Appears in bottom-left corner with accent border
- Non-interactive (pointer-events: none) for clean UX
- Only shows when hovering over a different theme than current

### 5. **Menu Interaction**
- Click paintbrush button to enable Paint Mode
- Right-click or click dropdown for theme options menu
- Menu shows current theme with checkmark (✓)
- Options: Light, Dark, System
- Footer hints: "Paint Mode: Press L/D/S"

## Architecture

### Component Hierarchy

```
main.tsx
├── App (manages isBrushMode state)
├── Particles (renders spring cursor when enabled)
└── Routes
    ├── DashboardPage (receives isBrushMode, onToggleBrush)
    │   └── ThemeBrushButton
    └── NotebookPage (receives isBrushMode, onToggleBrush)
        └── ThemeBrushButton
```

### Key Files

#### `/src/components/ThemeBrushButton.tsx`
- Main component for the paint theme button
- Manages menu visibility, peek theme state
- Handles keyboard shortcuts in Paint Mode
- Renders the dropdown menu with theme options
- Shows theme peek window on hover

#### `/src/components/Particles.tsx`
- Renders the spring cursor (ring + dot) when in Paint Mode
- Uses `useBrushCursor` hook for physics simulation
- Non-interactive elements (pointerEvents: none)

#### `/src/components/Particles.css`
- Spring ring animation (pulsing glow effect)
- Brush dot animation (brightness glow effect)
- Respects `prefers-reduced-motion` for accessibility

#### `/src/hooks/useBrushCursor.ts`
- Custom hook implementing spring physics
- Mass, stiffness, and damping parameters
- Tracks mouse position and applies spring forces
- Returns refs to ring and dot elements
- Cancels animation frame on cleanup

#### `/src/context/ThemeContext.tsx`
- Already existing theme provider
- Supports 'light', 'dark', 'system' modes
- Persists theme preference to localStorage
- Detects system preference via `prefers-color-scheme`

#### `/src/main.tsx`
- App-level brush mode state management
- Passes isBrushMode and onToggleBrush to pages
- Renders Particles component globally

## Physics Implementation

### Spring Model
The cursor uses a simple mass-spring-damper model:

```
Force = stiffness × distance
Acceleration = Force / mass
Velocity = (Velocity + Acceleration) × (1 - damping)
Position = Position + Velocity
```

### Parameters
- **stiffness**: 0.2 - Spring strength (how quickly it pulls toward cursor)
- **damping**: 0.15 - Energy loss (creates smooth deceleration)
- **mass**: 0.5 - Inertia (affects oscillation)
- **ringRadius**: 24px - Visual size of the spring ring

These values create smooth, responsive motion without excessive bouncing.

## Accessibility Features

### Keyboard Navigation
- Full keyboard support for theme selection
- All shortcuts clearly labeled in UI
- Esc key always exits Paint Mode

### Motion Preferences
- Detects `prefers-reduced-motion: reduce`
- Disables all animations when set
- Cursor still functions, just without spring motion
- Animations have `@media (prefers-reduced-motion: reduce)` rules

### Theme Support
- Works correctly in both light and dark themes
- Accent color adapts to current theme
- High contrast UI elements
- Proper focus states on buttons

## Usage Examples

### Basic Theme Change (Menu)
1. Click paintbrush button to enter Paint Mode
2. Right-click to open menu (or click dropdown arrow)
3. Click desired theme option
4. Menu closes, theme applies immediately

### Paint Mode Keyboard Flow
1. Click paintbrush button → enters Paint Mode
2. Press **D** → switches to Dark theme
3. Press **L** → switches to Light theme
4. Press **Esc** → exits Paint Mode

### Theme Preview
1. Click paintbrush button → enters Paint Mode
2. Right-click to open menu
3. Hover over "Light" option → peek window appears with light theme preview
4. Hover over "Dark" option → peek window updates with dark theme preview
5. Move away → peek window disappears

## Technical Details

### State Management
- **isBrushMode**: Boolean, managed at App level
- **theme**: 'light' | 'dark' | 'system', managed by ThemeContext
- **resolvedTheme**: Current effective theme ('light' or 'dark'), computed from theme + system preference
- **showMenu**: Boolean, menu visibility in ThemeBrushButton
- **peekTheme**: Current hovered theme for preview

### Performance Considerations
- `requestAnimationFrame` synced to display refresh rate (60fps)
- Spring calculation only runs in Paint Mode
- Minimal DOM updates (only position transforms)
- CSS transforms are GPU-accelerated
- No memory leaks: cleanup functions remove listeners and cancel RAF

### Browser Compatibility
- Uses standard Web APIs: `matchMedia`, `localStorage`, `requestAnimationFrame`
- CSS variables for theming (broad support)
- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Touch event support via mouse events (works on touch-enabled devices)

## Styling Integration

### CSS Custom Properties Used
- `--accent-color`: Primary theme color
- `--accent-text`: Text color on accent background
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`: Background layers
- `--text-primary`, `--text-secondary`, `--text-muted`: Text colors
- `--border-color`, `--border-subtle`: Border colors
- `--card-bg`: Card background color
- `--shadow-md`: Medium shadow
- `--accent-rgb`: RGB components of accent color (for rgba)

### Dynamic Theming
When theme changes:
1. ThemeContext updates `data-theme` attribute on document root
2. All CSS variables automatically update via CSS cascade
3. Page instantly responds to new theme
4. Theme preference saved to localStorage

## Future Enhancements

Possible extensions to consider:
- **Custom theme editor**: Allow users to create and save custom theme palettes
- **Theme transitions**: Animated fade between themes instead of instant switch
- **Gesture support**: Multi-touch gestures to trigger theme changes on mobile
- **Theme history**: Quick access to recently used themes
- **System sync**: Auto-update when OS theme preference changes (with user confirmation)
- **Paint palette picker**: Visual color palette selector in Paint Mode

## Troubleshooting

### Cursor Not Showing in Paint Mode
- Check browser console for JavaScript errors
- Verify `prefers-reduced-motion` is not set to `reduce`
- Ensure `zIndex: 9999` is not being overridden
- Try reloading the page

### Theme Not Persisting
- Check localStorage is enabled in browser settings
- Look for any storage privacy restrictions
- Check browser console for errors
- Try clearing cache and reloading

### Keyboard Shortcuts Not Working
- Ensure Paint Mode is active (paintbrush button highlighted)
- Check for conflicting browser shortcuts
- Try focusing on the page (click somewhere on content first)
- Verify Caps Lock is off (shortcuts are case-insensitive)

### Animations Stuttering
- Close other resource-intensive tabs
- Check CPU usage in browser DevTools
- Try disabling other extensions
- Update browser to latest version
