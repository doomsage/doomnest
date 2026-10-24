# DoomNest Hub Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the DoomNest app hub into a premium, Play-Store-clear developer showcase featuring an intro logo assembly that flies into the top bar, a compact searchable app directory with one-tap access, continuous scroll motion, and a Firestore-powered review/suggestion system on the `agy-redesign` branch without touching `main` or live deployment.

**Architecture:** A lightweight, vanilla HTML5/CSS3/ES-module web app with zero runtime framework dependencies. Uses the high-resolution `2-logo.png` asset for both the top-bar and the kinetic intro animation with CSS clip-paths/transforms, an accessible hash router (`#/` and `#/doomloader`), responsive dual-column grid for desktop/mobile viewports, and direct modular Firebase v10 Firestore integration (`doomnest-5f1fa`).

**Tech Stack:** Vanilla JavaScript (ES Modules), CSS3 (CSS Grid, Flexbox, Custom Properties, 3D Transforms, Backdrop Filter), Firebase v10 JS SDK (Firestore), Headless Chrome / Node for automated screenshot & end-to-end validation.

**Spec:** Redesign prompt specifications from the user request and existing project assets in `doomsage/doomnest`.

## Global Constraints
- Branch: Work strictly on `agy-redesign`. Do NOT push to `main` or touch the live Vercel deployment.
- Assets: Retain `2-logo.png` and all existing assets. Use the real `2-logo.png` everywhere (top bar, intro).
- Firebase: Connect to project `doomnest-5f1fa` using public web config only. No secrets or private keys in code or chat. No login/signup.
- Aesthetics: Ultra-premium dark theme (`#0a090e`, `#14121b`, `#f1eee0`, ember `#ff6a2b`, violet `#7f5af0`). No cyber/terminal aesthetic.
- Discovery: Compact app discovery showing ONLY icon, name, and rating. One-tap "Get" / "Soon" per row so users reach a download in one or two taps without long scrolling.
- Motion: Continuous scroll motion (parallax/shift). Absolutely NO scroll fade-in reveals. Intro logo flies directly into its slot in the top bar.
- Empty states: Honest empty states for unreleased APK and screenshots. No placeholder lorem ipsum or invented links.
- Responsiveness: Flawless at 390x844 (phone) and 1440x900 (desktop). No horizontal overflow. Package ID unclipped.

## Review Focus
1. Intro logo flight precision: When scaling down and flying into the top-bar logo, target coordinates must match the exact top-bar logo position across both 390px and 1440px viewports without jump or misalignment.
2. Package ID overflow: `com.doomloader.app` must wrap safely on narrow screens (320px–390px) without overflowing table bounds.
3. Review submission resilience: Empty/missing name or stars must be rejected with helpful UI feedback; Firebase network errors must show friendly inline messages.
4. One-tap download flow: When `RELEASE.apkUrl` is null, button must show "Not released yet" (or "Soon") and open the app detail page; when set to a valid URL, it directly triggers download.
5. Motion accessibility: `prefers-reduced-motion` must immediately skip the intro sequence to the fully settled hub view without animation flashes.

---

### Task 1: Environment & Verification Harness Setup

**Files:**
- Create: `tests/verify-ui.js`
- Create: `tests/package.json`
- Verify: `git branch` is `agy-redesign`

**Interfaces:**
- Consumes: Node.js runtime, local HTTP server (`npx serve .` or Python `http.server`), Chrome executable (`C:\Program Files\Google\Chrome\Application\chrome.exe`).
- Produces: Automated screenshot capture and DOM inspection script for 390x844 and 1440x900 viewports.

- [ ] **Step 1: Verify current git branch is `agy-redesign` and working tree is clean**
Verify: `git branch --show-current` returns `agy-redesign`.

- [ ] **Step 2: Create automated local test server and screenshot capture script**
Create `tests/verify-ui.js` that uses Chrome DevTools Protocol or Puppeteer via Headless Chrome to capture screenshots and assert:
1. HTTP 200 on local server.
2. Title and metadata are present.
3. Intro animation query frames (`?frame=0.5`, `?frame=1.5`, `?frame=2.2`).
4. Skip intro behavior (`?intro=0` or instant tap).
5. Hash navigation to `#/doomloader` and back to `#/`.
6. Package ID element has proper text wrap styles and no bounding overflow.
7. Mobile viewport (390x844) and desktop viewport (1440x900).

- [ ] **Step 3: Run baseline test against current index.html**
Run: `node tests/verify-ui.js`
Expected: Baseline passes and confirms test harness works.

- [ ] **Step 4: Commit harness to branch `agy-redesign`**
Commit test harness files to `agy-redesign`.

---

### Task 2: Kinetic Intro Animation with Logo Flight to Top Bar

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `2-logo.png`
- Produces: Smooth 1.8–2.3s opening sequence where slices fly in from perimeter to assemble in center, wordmark reveals, and the assembled logo scales and translates into `#bar-logo`, then hides intro overlay.
- Exports query flags: `?frame=<seconds>` for paused animation frames, `?skip_intro=1`, and respects `sessionStorage.getItem('dn_intro_seen')` and `matchMedia('(prefers-reduced-motion: reduce)')`.

- [ ] **Step 1: Build the slice coordinate geometry and kinetic keyframing**
Create 9 distinct slices using CSS background-position and percentage offsets derived directly from `2-logo.png`.
Implement dynamic vector offsets `[dx, dy, rot]` for each piece flying in from outside viewport boundaries.

- [ ] **Step 2: Implement "DoomNest" kinetic letter reveal**
Animate letters of "DoomNest" with staggered cubic-bezier reveals right after logo assembly settles.

- [ ] **Step 3: Implement Logo Scale-Down & Flight to Top Bar**
Calculate exact delta coordinates between screen center and the top-bar logo bounding rect:
`deltaX = barLogoRect.left + barLogoRect.width/2 - centerLogoRect.left - centerLogoRect.width/2`
`deltaY = barLogoRect.top + barLogoRect.height/2 - centerLogoRect.top - centerLogoRect.height/2`
`scale = barLogoRect.width / centerLogoRect.width`
Smoothly animate `lg` to `translate3d(deltaX, deltaY, 0) scale(scale)` while fading `#intro` backdrop.
Once animation finishes, set `sessionStorage.setItem('dn_intro_seen', '1')`, display `#bar-logo`, and remove/hide `#intro`.

- [ ] **Step 4: Implement skip controls & reduced motion**
Click/tap/scroll on `#intro` immediately advances animation to final settled state.
If `prefers-reduced-motion: reduce` or `sessionStorage.getItem('dn_intro_seen') === '1'`, immediately display final settled hub.

- [ ] **Step 5: Verify intro animation across viewports and frame stepping**
Run: `node tests/verify-ui.js --intro`
Expected: Intro frames captured cleanly at t=0.5s, 1.2s, 1.8s, 2.2s for both 390x844 and 1440x900.

- [ ] **Step 6: Commit intro improvements to `agy-redesign`**
`git commit -m "feat(intro): kinetic logo assembly flying into top bar slot"`

---

### Task 3: Premium Hub UI: Compact Searchable List, 3D Depth & Scroll Parallax

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `APPS` config array (`id`, `name`, `cat`, `tagline`, `rating`, `apkUrl`, `iconSvg`).
- Produces: Responsive top-bar with real `2-logo.png`, horizontal shifting marquee banner linked to scroll position, instant search and filter chips, compact app list rows with ONLY icon, name, rating, and Get/Soon button. 3D pointer tilt effect on cards.

- [ ] **Step 1: Top Bar & Marquee Header**
Refine top bar with Doomsage logo (`2-logo.png`), "DoomNest" wordmark, and subtle glassmorphic blur.
Add continuous scroll-linked shifting ticker banner: transform translates with `scrollY * factor`.

- [ ] **Step 2: Compact Searchable App Discovery List**
Data-driven `APPS` array with `doomloader` entry.
Search input with real-time text matching against name and category.
Category filter pills ("All", "Downloader").
App list rows displaying ONLY:
- App Icon: Clean gradient tile with download glyph.
- App Name: "Doomloader" (bold, crisp typography).
- Dynamic rating display: pulled from Firestore or fallback.
- Action button: "Get" (if `apkUrl` set) or "Soon" (if null). Tapping "Soon" opens `#/doomloader` in 1 tap.
Tapping row body navigates directly to `#/doomloader`.

- [ ] **Step 3: 3D Depth & Pointer Tilt on App Rows**
Add subtle perspective 3D tilt (`perspective(800px) rotateX(...) rotateY(...)`) on mouse pointer movement and touch feedback.
Layered ambient glow using logo colors (ember `#ff6a2b`, violet `#7f5af0`).

- [ ] **Step 4: Continuous Scroll Motion**
Bind background ambient glows and horizontal typographic marquee to `requestAnimationFrame` on scroll:
Motion = continuous movement tied to scroll position (NO fade-in-on-scroll reveals).

- [ ] **Step 5: Verify Hub layout at 390x844 and 1440x900**
Run: `node tests/verify-ui.js --hub`
Expected: Compact list renders without horizontal scroll; search filters instantaneously; Get/Soon buttons active; 3D tilt works smoothly.

- [ ] **Step 6: Commit Hub UI to `agy-redesign`**
`git commit -m "feat(hub): compact searchable app list with 3D depth and scroll parallax"`

---

### Task 4: App Detail Page (`#/doomloader`) & Unclipped Package ID

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `RELEASE` config (`apkUrl`, `version`), `APPS` list.
- Produces: Full Play-Store-style detail view at `#/doomloader` with back navigation, stats row, honest empty states, two-column layout on desktop, unclipped package ID table row.

- [ ] **Step 1: Header, Stats Row, & Dynamic Install Button**
Top bar back button with return to `#/`.
App header: icon, name, developer "Doomsage", tagline.
Stats row: dynamic rating, platform "Android", version, license "GPLv3".
Install button:
- When `RELEASE.apkUrl` is null/empty: button is disabled with text "Not released yet", accompanied by honest note explaining Android APK is not published yet.
- When `RELEASE.apkUrl` contains a URL: button becomes an active download link with "Install" label.

- [ ] **Step 2: Honest Empty Screenshots State & Real App Description**
Screenshots container with honest empty state: "Screenshots arrive with the first release", data-driven so adding screenshots later is simply an array of image URLs.
"About this app" section with accurate short description of Doomloader (Android video/reel downloader based on Seal).
Feature chips: "Downloader", "Open source", "No sign-in", "GPLv3".

- [ ] **Step 3: App Info & Safe Package ID Wrapping**
App info table:
- Package: `com.doomloader.app` on its own distinct row, with `overflow-wrap: anywhere; word-break: break-all;` preventing clipping or horizontal overflow on narrow screens.
- Platform: Android
- Version: Pending
- Based on: Seal (GPLv3)
- Offered by: Doomsage
Install steps: Honest 3-step sideloading guide for once released.

- [ ] **Step 4: Desktop Two-Column Layout (1440x900) & Phone Single Column (390x844)**
Use CSS Grid `@media (min-width: 820px)` with `grid-template-columns: 1.4fr 1fr; gap: 48px`.
Ensure large tap targets (>= 48px) and no horizontal scrollbar at any viewport.

- [ ] **Step 5: Verify App Detail Page at both viewports**
Run: `node tests/verify-ui.js --app`
Expected: All sections render cleanly, package ID does not clip, Install button is disabled with "Not released yet".

- [ ] **Step 6: Commit App Detail Page to `agy-redesign`**
`git commit -m "feat(app): play-store style app detail page with unclipped package id"`

---

### Task 5: Firestore Integration for Reviews & Feature Suggestions

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: Firebase v10 SDK (`initializeApp`, `getFirestore`, `collection`, `addDoc`, `query`, `orderBy`, `limit`, `getDocs`, `serverTimestamp`). Project ID: `doomnest-5f1fa`.
- Produces: Rating summary with star distribution bars, interactive 5-star rating picker, review form, live review cards, feature suggestion form with graceful error handling.

- [ ] **Step 1: Firebase Configuration & Safety Verification**
Verify public web config in `index.html`:
`apiKey: "AIzaSyBCcG4IoZQmkijkQqEkYmeMj6mPGkzNsyI"`
`projectId: "doomnest-5f1fa"`
Ensure no private keys or secrets exist.

- [ ] **Step 2: Ratings Summary, Star Bars, & Live Review List**
Query `reviews` collection where `app == 'doomloader'` ordered by `createdAt desc` (limit 50).
Calculate average rating and distribution percentages for 5, 4, 3, 2, 1 stars.
Update rating badges on both App Detail page and Home Hub card (`data-rate="doomloader"`).
Render review cards with avatar initial, name, star rating, formatted date, and review text.

- [ ] **Step 3: Review Submission Form with Input Validation**
Interactive 5-star selector with hover/tap visual highlight and accessibility labels.
Form validation:
- Require star rating (reject with "Please select a star rating" if 0).
- Name required (max 40 chars).
- Optional text (max 500 chars).
- Client-side cooldown (60 seconds) to prevent accidental double posts.
- Graceful error messaging if network fails.

- [ ] **Step 4: "Suggest a Feature" / Ideas Box**
Form with Name and Idea text.
Submits to `ideas` collection with `name`, `text`, `createdAt`.
Provides instant feedback and reset upon submission.

- [ ] **Step 5: Verify Review and Suggestion Flow via Test Harness**
Run: `node tests/verify-ui.js --firebase`
Expected: Reviews query succeeds, forms validate input correctly, ratings summary updates.

- [ ] **Step 6: Commit Firebase integration to `agy-redesign`**
`git commit -m "feat(firebase): robust reviews and ideas integration with live rating aggregation"`

---

### Task 6: Full Verification, Responsive Screenshot Capture & Wrap-up

**Files:**
- Output screenshots to: `tests/screenshots/`
- Verify against: 390x844 (phone) and 1440x900 (desktop)

**Interfaces:**
- Consumes: Complete redesign in `index.html` on `agy-redesign` branch.
- Produces: Comprehensive screenshot gallery of every view and state:
  1. Intro mid-animation frames (flying in, assembling, scaling into top bar).
  2. Hub UI (compact app list, search active).
  3. App detail page top.
  4. App detail page reviews & suggest a feature.
  5. Scrolled states demonstrating continuous scroll motion.
  6. Phone ratio (390x844) vs Desktop (1440x900).

- [ ] **Step 1: Run comprehensive headless screenshot suite**
Capture high-DPI screenshots of all views and states for both viewports.

- [ ] **Step 2: Inspect all captured screenshots for clipping, alignment, and responsiveness**
Verify zero overflow, zero clipped package ID, crisp logo rendering, smooth gradients.

- [ ] **Step 3: Verify git status and safety rules**
Confirm on branch `agy-redesign`, no commits on `main`, zero pushes to remote.

- [ ] **Step 4: Generate completion report and summary**
Document what was built, UI design choices, configuration points, and test results.
