# Dreamer — AI Image Generator

Dreamer is an Android app shell for generating images from text prompts through a configurable remote image-generation API.

## Build an APK

1. Open **Actions** and enable workflows if prompted.
2. Run **Build Dreamer APK** from the Actions tab, or push a change to `main`.
3. Download the `dreamer-debug-apk` artifact from the completed workflow run.

## Configure image generation

The app accepts a compatible image-generation API endpoint in Settings. A backend is required; this repository does not bundle an AI model or claim that images can be generated offline.

## Status

The APK is built by GitHub Actions. No APK is available until the workflow completes successfully.