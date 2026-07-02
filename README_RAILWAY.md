Railway deployment guide for Cupidon bot

1) Ensure repository contains all files and `package.json` has a start script (`npm start`).

2) Code change: bot reads `AUTH_DIR` env var to store auth state. Default is `auth`.

3) Railway steps (web):
   - Create account at https://railway.app
   - New Project -> Deploy from GitHub -> select repo/branch
   - In Project -> Variables add `AUTH_DIR` = `/mnt/auth`
   - Project -> Plugins -> Add Persistent Disk (name: auth) -> mount path `/mnt/auth`
   - Redeploy and monitor logs. The `auth` folder will be persisted.

4) Local test:
   ```bash
   npm install
   node bot.js
   ```

5) Notes:
   - Do NOT commit secrets; use Railway Variables for keys.
   - Free tier may sleep or have limits. Persistent volumes may require upgrade.
   - Persistent disk mounting (step 3) is required to keep WhatsApp credentials across restarts.

 - For the initial authentication you have two practical choices:
   - A) Run locally first (preferred). Then upload those files into Railway’s persistent disk. Use the provided `package_auth.sh` (or `package_auth.ps1` on Windows) to create `auth.tar.gz`/`auth.zip` and upload/extract it into the mounted volume in Railway.
   - B) Deploy to Railway and scan the QR from Railway logs (may be harder to scan than local terminal).

Files added:
- `Dockerfile` — containerize the bot for Railway or other Docker hosts.
- `.dockerignore` — excludes local files from Docker context.
- `package_auth.sh` / `package_auth.ps1` — package the `auth/` directory for upload to Railway persistent disk.

How to use `package_auth.sh` (Linux/macOS):
```bash
./package_auth.sh
# upload auth.tar.gz via Railway web UI to the persistent disk and extract there
```

On Windows PowerShell:
```powershell
.\package_auth.ps1
# upload auth.zip via Railway web UI
```

If you want, I can also add a small `railway-upload.sh` that uses the Railway CLI to copy files into the mounted volume — tell me and I will add it.
