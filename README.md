# Health Insurance Risk Calculator: Client (Azure static website)

Plain HTML, CSS and JavaScript. No build step, no dependencies.
**No calculations happen in this code.** All BP, BMI and risk logic is in the Node.js API.

## Files

```
index.html        page structure, BP chart, form
css/styles.css    styling
js/config.js      <-- the ONLY file you edit: set API_BASE_URL
js/app.js         form checks, API calls, console logging, results
```

## Run locally

1. Edit `js/config.js` and set `API_BASE_URL` (default is `http://localhost:3000`).
2. Open `index.html` in a browser, or serve the folder:
   `npx serve .`  (or VS Code "Live Server").
3. Open the browser console (F12) to see the `[API REQUEST]` / `[API RESPONSE]` messages.

## What the client expects from the API

All requests are `GET` and return JSON. Share this with whoever writes each API story,
and change it together if the team agrees on something different.

| API | Query string | Response |
|-----|--------------|----------|
| `/ping` | none | anything (200 OK) |
| `/bp-category` | `systolic`, `diastolic` | `{ "category": "normal" }` |
| `/bmi` | `feet`, `inches`, `pounds` | `{ "bmi": 24.4, "category": "normal" }` |
| `/risk-category` | `age`, `bmi` (category), `bp` (category), `diabetes`, `cancer`, `alzheimers` (true/false) | `{ "score": 35, "category": "moderate risk" }` |

Notes:
- The client calls `bmi` and `bp-category` first, then passes their `category` values to `risk-category`.
- Category text is shown as returned. The chart row highlight and badge color look for the words
  `normal`, `elevated`, `stage 1`, `stage 2`, `crisis` and `low`, `moderate`, `high`, `uninsurable`.
- On an error, return a non-200 status with `{ "error": "plain-English message" }`. The client shows that message.
- The API must enable **CORS** for the static site's URL (for Express: `npm i cors`, then `app.use(cors())`).

## Deploy to Azure

1. Create an Azure Storage account and enable **Static website** (index document: `index.html`).
2. Upload the contents of this folder to the `$web` container (or deploy with a GitHub Action).
3. Put the Node API URL in `js/config.js` and commit.
4. Test from the static site URL (`https://<name>.z13.web.core.windows.net/`).
