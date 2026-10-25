# Data Sphere Club — website

Static site (index.html + hero.webp poster image) plus one
serverless function (`api/config.js`) that gives you a single global
admin password and shared content (Google Form link, feedback link,
events, mission/about text) that updates on every visitor's device, not
just your own.

Gallery photos and videos are handled separately, straight from files on
disk — see below.

## Deploy on Vercel

1. Go to vercel.com → Add New → Project → import this folder (or drag-and-drop
   it in the dashboard), or deploy from the CLI with `vercel --prod` from
   inside this folder.
2. Framework preset: "Other". A small build step (`vercel-build` in
   `package.json`) runs automatically on every deploy — you don't need to
   configure anything for it.
3. Deploy once first (it'll work immediately in browser-only fallback mode —
   see below). Then follow "Enable the global admin backend" and redeploy
   to switch on the shared password + shared content.

## Gallery (photos & videos) — the workflow you asked for

Drop image and video files straight into the `/gallery` folder, using
whatever filenames you like (`photo1.jpg`, `photo2.jpg`, `video1.mp4`,
`IMG_2034.png`, ...), then deploy:

```
vercel --prod
```

That's it — no admin panel, no config file to hand-edit. A build script
(`scripts/build-gallery.js`) scans the folder automatically on every deploy,
writes `gallery/manifest.json` listing everything it found, and the site
reads that on page load. Files are sorted "naturally" (`photo2` before
`photo10`), not alphabetically.

Supported extensions:
- **Images**: `.jpg` `.jpeg` `.png` `.webp` `.gif` `.avif`
- **Videos**: `.mp4` `.webm` `.mov` `.m4v`

Anything else in that folder (including `manifest.json` itself and dotfiles
like `.DS_Store`) is ignored automatically.

To check what the manifest will look like before deploying, run:
```
npm run build:gallery
```
That prints a count and writes `gallery/manifest.json` locally so you can
open it and sanity-check it.

### A real limit worth planning around

Vercel's free (Hobby) plan caps a CLI deploy's total source size at **100 MB**,
and its cross-repo bandwidth at 100GB/month. 100 compressed photos is easy —
even at a generous ~500KB each that's only ~50MB. **20 raw phone videos is
the risky part** — a single 4K clip can be 100–300MB on its own, which blows
past the 100MB limit almost immediately. Before adding a video:
- Trim it to just the part worth keeping.
- Compress it (e.g. `ffmpeg -i in.mov -vf scale=-2:720 -crf 28 out.mp4` gets
  most clips into single-digit MB at 720p, plenty sharp for a gallery tile).
- If you want full-quality video anyway, either upgrade to Vercel Pro (1GB
  CLI limit), or upload the video to YouTube/Drive and link out to it instead
  of hosting the file yourself — happy to wire that up as an alternative if
  you'd rather not compress every clip.

At the pace of "100 photos and 20 videos over 1–2 years", spread across many
small deploys, compressed video is comfortably within Hobby-plan limits.

## Enable the global admin backend (one password, synced across every device)

This covers everything *except* the gallery (registration link, feedback
link, events, mission/about text). It uses a GitHub repo as a tiny JSON
database and a Vercel serverless function as the only thing allowed to write
to it — your GitHub token never reaches the browser, so it can't be read
from the page source.

1. **Create a GitHub repo** (private is fine, e.g. `datasphere-config`).
2. **Add a file** named `config.json` at the root of that repo with:
   ```json
   {
     "formUrl": "https://forms.gle/REPLACE_WITH_YOUR_GOOGLE_FORM_LINK",
     "feedbackUrl": "https://forms.gle/REPLACE_WITH_YOUR_FEEDBACK_FORM_LINK",
     "events": [
       "Day 1 — Inauguration | | Kickoff event for Data Sphere Club — welcome address, department overview, and a look at what lies ahead this year.",
       "Coming soon | | More events will be announced here.",
       "Coming soon | | More events will be announced here."
     ],
     "mission": "The Department of Artificial Intelligence & Data Science is built to turn curious students into confident practitioners...",
     "about1": "Data Sphere is the student-run club of the AI & DS department...",
     "socialLinks": [
       "Instagram | https://instagram.com/REPLACE_WITH_YOUR_HANDLE",
       "WhatsApp | https://wa.me/REPLACE_WITH_YOUR_NUMBER"
     ],
     "privacyUrl": "/privacy.html",
     "termsUrl": "/terms.html",
     "copyrightText": "Data Sphere Club, Don Bosco Institute of Technology, Bengaluru. All rights reserved."
   }
   ```
   Each event line is `Title | Date | Description` (date is optional — leave it
   blank between the two `|` marks). A title of exactly `Coming soon` renders
   as a dashed placeholder card. The admin panel's "+ Add event" button edits
   these as separate fields — you don't need to hand-format the `|` syntax
   yourself unless you're editing `config.json` directly.

   `socialLinks` works the same way: each line is `Label | URL`, and the
   admin panel's "+ Add link" button lets you add as many as you want —
   Instagram, WhatsApp, LinkedIn, Discord, whatever — each rendered as a
   small pill link in the footer. `copyrightText` is just the text after
   "© 2026" — the year is added automatically so you never have to update it
   by hand.

## Privacy Policy & Terms and Conditions pages

`privacy.html` and `terms.html` are two standalone pages at the project
root, styled to match the main site (same fonts, same four soft themes,
same glass-card look) with no images. They're filled in with reasonable
starter legal text for a college club (what's collected via the
registration/feedback forms, event photos in the Gallery, Google Forms as
a third party, etc.) — **this is boilerplate, not legal advice**; it's
worth a quick read-through (and ideally a look from someone at the
institution) before treating it as final, especially around how member
data and event photos are handled.

By default the footer's "Privacy Policy" and "Terms & Conditions" links
point at `/privacy.html` and `/terms.html`. If you'd rather link to a
Google Doc or something hosted elsewhere instead, just change `privacyUrl`
/ `termsUrl` in the admin panel (or `config.json`) to that URL — the two
pages here are independent static files and won't be affected either way.
3. **Create a GitHub token**: GitHub → Settings → Developer settings →
   Fine-grained tokens → generate one scoped only to the `datasphere-config`
   repo, with **Contents: Read and write** permission.
4. In your **Vercel project → Settings → Environment Variables**, add:
   | Name | Value |
   |---|---|
   | `GITHUB_TOKEN` | the token from step 3 |
   | `GITHUB_OWNER` | your GitHub username or org |
   | `GITHUB_REPO` | `datasphere-config` |
   | `GITHUB_PATH` | `config.json` |
   | `GITHUB_BRANCH` | `main` |
   | `ADMIN_PASSWORD` | `ask the owner of repo` |
5. **Redeploy** (env var changes need a redeploy to take effect).

Once redeployed: everyone who opens the live URL loads the shared
`config.json` on page load. Clicking the gear icon anywhere now always asks
for the same password ( whatever you set `ADMIN_PASSWORD` to).
A successful save commits the update straight to `config.json` on GitHub —
so it's the same content and the same password on every device, no local
per-browser state involved, and **no redeploy needed** for these fields.

To change the password later, just update `ADMIN_PASSWORD` in Vercel's
environment variables and redeploy — there's no UI for it, by design, so it
can't be read out of the page source.

## If you skip the admin backend setup

The site still works without any of this — the gear icon falls back to
per-browser storage (each device sets and remembers its own password and
content, not shared with other visitors). That's fine for testing, but for
one shared password and content synced everywhere, do the setup above.
The gallery workflow above doesn't depend on any of this and works either way.

## Editing content without any admin panel at all

You can also just hardcode things directly in `index.html` before deploying:
search for `REPLACE_WITH_YOUR_GOOGLE_FORM_LINK` / `REPLACE_WITH_YOUR_FEEDBACK_FORM_LINK`
for the two links, and the `#mission` / `#about` sections in the HTML for the
text. Redeploy and it's permanent for everyone, no backend needed.

## Newer features (all editable from the gear icon, no redeploy)

- **Registrations open/closed** switch + closed message. While the form link is still a `REPLACE_WITH...` placeholder, the button shows "Registration opening soon" instead of a dead link (same for the feedback button and social links, which simply hide).
- **Announcement banner** — one line (optional link) shown in the hero card.
- **Events**: write the date as `YYYY-MM-DD` and the event moves to *Past events* automatically after that day; upcoming dated events get an **Add to calendar** button and a "Next up: … in N days" line. The optional 4th field (link) becomes "Details →" / "View photos →".
- **Team** (`Name | Role | Link`) and **FAQ** (`Question | Answer`) — one per line. Delete all lines to hide a section.
- **Leaderboard** page (`/leaderboard.html`): one member per line, `Name | Points | Note`; pasting two columns straight from a spreadsheet works. Ties share a rank. Open `/leaderboard.html?demo=1` to preview with sample data. The privacy policy now mentions that names/points may be shown publicly.
- **Link previews / favicon**: `og-image.jpg` + meta tags. On deploy, `scripts/build-meta.js` makes them absolute using Vercel's production URL. If you add a custom domain, set an env var `SITE_URL=https://yourdomain` in Vercel. Check the result with a WhatsApp share or a Facebook Sharing Debugger.

## Visual effects

- **Scroll fade-in** on section headings, cards, events, team and FAQ.
- **Background particles** drift, move at different speeds as you scroll up/down, and take the colors of the selected theme (a few dodge the mouse on laptops).
- **Custom cursor** (dot + ring, grows on links/buttons, ripple on click) only appears on devices with a mouse. Phones, tablets and anyone with "reduce motion" turned on don't get it, and particles stay still for them.
To remove any effect, delete the matching part of the last `<script>` block in `index.html`.
