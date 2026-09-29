# Addison Means — portfolio site

Live at https://addison-means.vercel.app

Plain static site, no build step:

- `index.html` — all page content. Each page is a `<section data-page="…">`.
- `css/styles.css` — styling. Colors, fonts and heading size are at the top in `:root`.
- `js/main.js` — page switching, mobile menu and scroll animations.
- `img/`, `headshot.png` — photos.

To preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
To deploy: `vercel --prod` from this folder.
