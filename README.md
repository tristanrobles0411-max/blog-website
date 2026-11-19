# Bayan News

## Local development

```powershell
npm install
npm start
```

Open `http://localhost:3000`.

## GitHub Actions deployment to Railway

1. Create a Railway project and add this GitHub repository or create a Railway service for it.
2. In the Railway dashboard, create a project or account token.
3. In GitHub, open **Settings → Secrets and variables → Actions**.
4. Add this repository secret:
   - `RAILWAY_TOKEN`: your Railway token.
5. Optionally add:
   - `RAILWAY_SERVICE`: the exact Railway service name.
6. Push a commit to `main`, or open **Actions → Deploy to Railway → Run workflow**.

In Railway, set the start command to:

```text
npm start
```

No GitHub Pages or Render configuration is required. The workflow requires a valid Railway token and service configuration.
