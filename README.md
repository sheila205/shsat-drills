# Products to Know Practice

A single-page drill app with a tiny Node server that keeps one practice log. Every device that opens the site sees the same log.

- No dependencies. `npm start` runs it.
- The log is one JSON file (`log.json`) in the data folder.
- An optional access code keeps strangers out.

## Deploy on Railway

1. Put this folder in a GitHub repository (a private repo is fine).
2. In Railway: **New Project → Deploy from GitHub repo** and pick the repo. Railway detects Node and runs `npm start`.
3. **Add a volume** so the log survives redeploys: open the service → **Settings → Volumes → Add volume**, mount path `/data`. The server finds it automatically through `RAILWAY_VOLUME_MOUNT_PATH`.
4. **Set an access code**: service → **Variables** → add `ACCESS_CODE` with any code you like. Everyone who opens the site enters it once per device.
5. **Get a URL**: service → **Settings → Networking → Generate Domain**.

Without step 3, Railway wipes the log every time it redeploys.

Prefer the command line? Install the Railway CLI, then from this folder run `railway init`, `railway up`, and add the volume and variable in the dashboard.

## Run it locally

```
npm start
```
Then open http://localhost:3000. Set `ACCESS_CODE=yourcode` first to test the code prompt.

## Settings

| Variable | What it does |
|---|---|
| `ACCESS_CODE` | Code required to read or save the log. Leave unset for no code. |
| `DATA_DIR` | Where `log.json` lives. Defaults to the Railway volume, then `./data`. |
| `PORT` | Set by Railway automatically. |

## Backing up or resetting the log

The whole history is `/data/log.json` on the volume. To start fresh, delete that file and redeploy.
