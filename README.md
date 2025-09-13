# iKey – Secure Location & Personal Safety Hub

## Overview

iKey is a lightweight, client‑side web app that keeps your location and key personal safety information readily available without relying on any server. Everything runs in the browser and data is stored in `localStorage`, allowing the app to work offline and without user accounts.

## Features

- **Current Location** – displays GPS coordinates and lets you quickly copy or share them by text or email.
- **Emergency QR Code** – generate a QR code that embeds basic info for first responders. The data lives only inside the QR image.
- **Favorites Grid** – customise a home screen with your own bookmarks, Proton tools, or quick actions like calling 911 or 988. Long‑press to edit and drag to reorder.
- **Built‑in Tools** – access weather, a Nashville police dispatch feed, community resources, meal schedules, and an ICS event/ invite generator.
- **Internationalization** – interface strings come from `TRANSLATION_TERMS.md` and can be switched between English, Español, العربية, Kurdî, Af‑Soomaali and 中文.
- **Accessibility Settings** – adjustable text sizes and large touch targets make the interface usable on phones and tablets.

## Privacy

- No data ever leaves your browser unless you choose to share it.
- Clearing browser storage removes all saved information and favorites.
- There is currently **no encryption** or password protection; treat the app as a convenience layer for readily shareable info.

## Running the App

The project is a collection of static HTML files. Open `index.html` directly in a browser or serve the folder from any static web host.

## Deployment

For production use, host the files on a neutral domain that doesn't identify individuals, such as `ikey.yourorg.org`.

## Development

The repository has no build step. Edits can be made directly to the HTML or translation files. A helper script in `scripts/generate_translation_doc.py` regenerates the translation document when new terms are added.

### Dynamic translations

When adding DOM elements at runtime (wizards, modals, etc.), call the global `translateFragment(rootElement)` helper from `scripts/translate.js`. It applies `data-i18n*` translations to the supplied subtree so new UI fragments are translated immediately.

## Contributing

### Accessibility

- Use semantic HTML and meaningful ARIA roles.
- Provide descriptive `alt` text for all images and icons.
- Ensure keyboard navigation and sufficient color contrast when introducing new UI.

### Privacy

- Keep all data client-side; avoid adding analytics or external trackers.
- Clearly communicate that information is stored in `localStorage` without encryption.
- Only collect data that is essential for emergency use and allow users to remove it.

### Translations

- Add new strings to `TRANSLATION_TERMS.md`.
- Run `python scripts/generate_translation_doc.py` to update the compiled document.
- Provide translations for supported languages when possible.

## License

This project is provided as a public good. Use at your own discretion and always verify critical information before sharing it in emergencies.

## Changelog

- Verified that no legacy `ikey2` or `ikey3` references remain in the codebase and confirmed all JavaScript files under `scripts/` are active with no dead code paths.
