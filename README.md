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

## Development

The repository has no build step. Edits can be made directly to the HTML or translation files. A helper script in `scripts/generate_translation_doc.py` regenerates the translation document when new terms are added.

## License

This project is provided as a public good. Use at your own discretion and always verify critical information before sharing it in emergencies.
