# Health Insurance Risk Calculator: Client

A friendly web form where customers enter their health information and get a risk assessment from Health Insurance, Inc.
Built with plain HTML, CSS and JavaScript (no build step, no dependencies) and hosted as an **Azure Static Web App**.

**No calculations happen in this code.** The client collects and checks input, calls the Node.js API, and displays the result. All blood pressure, BMI and risk logic lives in the API.

## Live links

| What | Link |
|------|------|
| Live website | https://lemon-bay-09f25771e.6.azurestaticapps.net |
| This repo (client) | https://github.com/abdulrahman1-lewis/health-risk-client |
| API repo | https://github.com/abdulrahman1-lewis/health-risk-api |
| Live API (health check) | https://abdul-health-risk-api-acgydsg0hte7g9aj.westus3-01.azurewebsites.net/ping |

The API runs on Azure's free plan, so it sleeps when idle. The first request after a quiet period can take up to a minute. The page calls `/ping` on load to wake it up, and the status badge at the top shows when the server is ready.

## What the client does

- Shows the blood pressure category chart and lets the user pick systolic and diastolic values from drop-downs.
- Collects age, height (feet and inches), weight (pounds) and family history (diabetes, cancer, Alzheimer's).
- Checks that every field is filled in and in a sensible range, with plain-English error messages.
- Calls the API, then shows the inputs used, the BMI and blood pressure categories, the points, and the risk category.
- Highlights the user's row in the blood pressure chart.
- Lets the user evaluate another person, and keeps a short list of earlier results for the visit.
- Writes a console message every time an API is called and every time a response is received (open the browser console with F12).

## Files

```
index.html        page structure, BP chart, form
css/styles.css    styling
js/config.js      the ONLY file to edit: sets API_BASE_URL
js/app.js         input checks, API calls, console logging, results
```

## API the client calls

All requests are `GET` and return JSON.

| API | Query string | Response |
|-----|--------------|----------|
| `/ping` | none | `{ "status": "ok" }` |
| `/bp-category` | `systolic`, `diastolic` | `{ "category": "normal" }` |
| `/bmi` | `feet`, `inches`, `pounds` | `{ "bmi": 24.4, "category": "normal" }` |
| `/risk-category` | `age`, `bmi`, `bp`, `diabetes`, `cancer`, `alzheimers` | `{ "score": 35, "category": "moderate risk" }` |

The client calls `bmi` and `bp-category` first, then sends their categories to `risk-category`. Errors come back as HTTP 400 with `{ "error": "message" }`, and the client shows that message.

## Run locally

1. Open `js/config.js` and set `API_BASE_URL`:
   - local API: `http://localhost:3000`
   - live API: `https://abdul-health-risk-api-acgydsg0hte7g9aj.westus3-01.azurewebsites.net`
2. Serve the folder (for example `npx serve .`, or VS Code "Live Server") and open the address it prints.
3. Open the browser console (F12) to see the `[API REQUEST]` and `[API RESPONSE]` messages.

If you run the API locally on port 3000, the client will be served on a different port, which is fine.

## Hosting and CI/CD

- Hosted on **Azure Static Web Apps** (Free plan), connected to this repo's `main` branch.
- Every push to `main` triggers a GitHub Action (see the **Actions** tab) that redeploys the site automatically.
- To change which API the site talks to, edit `js/config.js` in GitHub and commit. The site redeploys within about a minute.
- The API must allow this site's address. It does this through the `ALLOWED_ORIGINS` setting on the API's Azure Web App, which is set to `https://lemon-bay-09f25771e.6.azurestaticapps.net`.

## Team

| Role | Name |
|------|------|
| Scrum Master | _add name_ |
| Product Owner | _add name_ |
| Developers | abdulrahman1-lewis, _add teammate_ |

Course: CPSC 44000, Lewis University, Sprint 4.
