# Run the cloud rendering worker on Windows

Render continues hosting the authenticated API at https://videoeditor-1-h4we.onrender.com.
Vercel hosts the frontend; Supabase holds jobs and private media. Only rendering runs
on your computer. No inbound port, tunnel, Docker, or paid Render worker is needed.
Do not run `npm start`: that starts an API, not this worker.

## One-time setup

Install Git for Windows, Node.js **22 LTS**, and 64-bit Python **3.11 or newer**
(with pip and the PATH option enabled). Open a new PowerShell window afterwards.
This repository work does not install anything on your computer.

In a folder where you want the project:

```powershell
git clone --branch arena/edccf97e-videoeditor --single-branch https://github.com/sermontech/videoeditor.git
cd videoeditor
node --version
python --version
npm ci
npm run setup:render
```

If you already have a checkout on this branch, use `git pull --ff-only` instead of
cloning. Preserve any local changes. If PowerShell blocks npm.ps1, use `npm.cmd`
in place of `npm`. If Python isn't found, reopen PowerShell after installing it,
or set `$env:PYTHON` to the full path of your Python executable before setup.
Setup installs pinned Pillow and imageio-ffmpeg into ignored `.tools/python`;
imageio-ffmpeg supplies FFmpeg. Windows Arial Bold is used by default.

## Start the worker each time

From the repository directory:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-windows-worker.ps1
```

The execution-policy override is scoped to this new process, not a machine-wide
policy change. Read the script before running it. Respect managed-device policies.

The launcher checks Python/Pillow/FFmpeg, then prompts for the Supabase secret or
legacy service_role key from **Seler Ecommerce → Settings → API Keys**. Paste it
only into this hidden local prompt, not chat, a command, a file, or frontend settings.
Clear your clipboard afterwards. The key is not saved by the launcher or included
in shell command history. It exists in process memory/environment while running;
other privileged local software could read it. Use only a trusted computer.
This key is privileged across the shared ecommerce project, not just Clear Take.
Media-rendering subprocesses receive a restricted environment without the key.

Expected output:

```text
Python, Pillow and FFmpeg checks passed.
Clear Take worker started. Waiting for durable jobs.
```

Keep the window open, the computer awake and connected to the internet. No public
worker URL or firewall port opening is needed. Start only one instance initially.
Press Ctrl+C when idle to stop. Stopping during a render can fail that attempt;
a sudden power/network loss leaves a lease that can expire and be retried (bounded
attempt count). Pending jobs wait while the computer is off. Downloaded media uses
the Windows temp directory; normal completion cleans it up, but abrupt shutdowns
can leave `clear-take-job-*` directories. Remove leftovers only when no worker runs.

`Queue unavailable` means the queue request failed; check connectivity and key,
and that the existing migrations are present. Do not reapply migrations blindly.
Never share raw environment dumps or keys when requesting help.

## Verification status and remaining setup

Automated tests passed on Linux: 15 units, including Windows environment/default
selection, and a real FFmpeg MP4 through mocked cloud queue/storage. The PowerShell
launcher and Windows process-tree termination still require a real Windows test.
A startup banner alone does not prove queue connectivity or successful rendering.

Vercel cloud configuration, Auth redirects, account membership approval, and a real
end-to-end export remain necessary. After the website is connected, submit one
short video, look for `Completed job` in the worker, and download/play the MP4.
