# Home Page Implementation Tasks

## Layout
- [ ] Use grid layout: 4-8-4 columns on mobile; 12-column system on desktop.
- [ ] Cards stack vertically with 16px gap and padding.

## Visual Hierarchy
- [ ] Emergency strip buttons: 60px height, 18px font size, 700 weight.
- [ ] Primary info (e.g., medical summary): 16px font with 1.5 line-height.
- [ ] Secondary info: 14px font with 0.8 opacity.

## Color Coding
- [ ] Apply colors by data source: green permanent, gray device, blue live, red emergency.
- [ ] Add left border indicators for data cards based on source.

## Touch Targets
- [ ] Ensure all interactive elements are at least 44x44px.
- [ ] Add 12px spacing between adjacent buttons to prevent mis-taps.

## Information Architecture
- [ ] Render cards in priority order: emergency_strip → medical_alert → current_location → emergency_contacts → weather_alerts → quick_access → backup_restore.

## Components
- [ ] Emergency strip at top with 911, location, and medical buttons in that order.
- [ ] Implement data card pattern with badge (icon, text) and content.

## State Indicators
- [ ] Add skeleton loading screens.
- [ ] Provide clear empty states with primary action.

## Responsive Breakpoints
- [ ] Mobile: default 0-600px.
- [ ] Tablet: 600-1024px with 24px container padding and 2-column card grid.
- [ ] Desktop: ≥1024px with max-width 800px.

## Typography
- [ ] Use three text styles: title (20px, 700 weight), body (16px, 1.5 line-height), caption (14px, secondary color).
- [ ] Use system font stack without external fonts.

## Interaction Feedback
- [ ] Provide active/press effects for all buttons (scale 0.95, opacity 0.8).
- [ ] Focus-visible outline: 3px solid primary color with 2px offset.
- [ ] Implement toast notifications for status messages.

## Data Display
- [ ] Always display data source badges (QR, device, live).
- [ ] Use progressive disclosure for complex medical info: critical first, details in expandable section.

## Error Handling
- [ ] Show user-friendly error messages with actions for location_denied, storage_full, offline, and qr_invalid.

## Performance
- [ ] Page interactive in <2s on 3G and <1s on 4G.
- [ ] Total JS bundle under 50KB.
- [ ] Core features work offline and without external dependencies.

