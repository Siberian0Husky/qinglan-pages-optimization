# Qinglan Pages Optimization

This folder contains recommended config files for Cloudflare Pages and GitHub Actions deployment.

## What is included

- `_headers` — sets long-term caching for CSS/JS and normal HTML caching.
- `.github/workflows/deploy.yml` — GitHub Actions workflow to auto-deploy on push.

## How to use

1. Copy site files (`index.html`, `about.html`, `reports.html`, `checkout.html`, `styles.css`, `app.js`, etc.) into your repository root.
2. Copy `_headers` into the repository root.
3. Copy `.github/workflows/deploy.yml` into your repository.
4. Push your repository to GitHub.
5. Add these repository secrets in GitHub Settings:
   - `CF_PAGES_API_TOKEN`
   - `CF_ACCOUNT_ID`
   - `CF_PROJECT_NAME`
6. On every push to the `main` branch, GitHub Actions will deploy the static site to Cloudflare Pages.

## Notes

- If your site uses build tooling, adjust the workflow `directory` and build step accordingly.
- The `_headers` file helps browsers cache `styles.css` and `app.js` for one year while keeping HTML fresh.
- If you prefer Cloudflare Pages direct GitHub integration, you can still use `_headers` and skip the workflow.
