# Laptop Time

A very lightweight Windows laptop activity tracker built with Node.js.

It runs in the background and tracks **active laptop usage** based on keyboard/mouse activity. When the user is idle for a configured period, tracking pauses automatically.

## Features

- Lightweight Node.js application
- Tracks daily active laptop usage
- Automatically detects idle time
- Stores data locally in JSON
- No account required
- No cloud services
- No telemetry
- Can run automatically when Windows starts
- CLI-based, with no GUI

## Requirements

- Windows 10/11
- Node.js
- pnpm

Check your installation:

```powershell
node --version
pnpm --version
```

## Installation

Clone or copy the project:

```powershell
cd E:\Projects
git clone <repository-url> laptop-time
cd laptop-time
```

Install dependencies:

```powershell
pnpm install
```

## Project Structure

```text
laptop-time/
├── index.js
├── package.json
├── pnpm-lock.yaml
├── start-tracker.cmd
├── src/
│   ├── tracker.js
│   ├── storage.js
│   └── cli.js
└── data/
    └── usage.json
```

## Start Tracking Manually

Run:

```powershell
pnpm start
```

You should see:

```text
Laptop Time Tracker
-------------------
Tracking started.
Idle after 5 minutes.

● Active
```

The tracker continues running until you stop it with:

```text
Ctrl + C
```

## Check Today's Usage

Open another PowerShell window and run:

```powershell
pnpm today
```

Example:

```text
Laptop Screen Time
------------------
Today: 6h 42m
```

## Check the Last 7 Days

```powershell
pnpm week
```

Example:

```text
Last 7 Days
-----------
2026-09-18: 6h 42m
2026-09-17: 7h 15m
2026-09-16: 5h 51m
2026-09-15: 8h 04m
2026-09-14: 3h 22m
2026-09-13: 2h 17m
2026-09-12: 6h 38m
-----------
Total: 40h 09m
```

## Check This Month

```powershell
pnpm month
```

Example:

```text
This Month
-----------
Total: 84h 31m
```

## How Tracking Works

The tracker periodically checks whether the user has recently interacted with the laptop.

By default:

```text
Active
  ↓
Keyboard/mouse activity detected
  ↓
Time is counted

Idle
  ↓
No input for 5 minutes
  ↓
Time is not counted
```

The idle threshold is configured in `index.js`:

```js
const IDLE_LIMIT = 5 * 60 * 1000;
```

For example, to use 10 minutes:

```js
const IDLE_LIMIT = 10 * 60 * 1000;
```

## Local Data

Usage data is stored locally in:

```text
data/usage.json
```

Example:

```json
{
  "2026-09-16": 21060,
  "2026-09-17": 26100,
  "2026-09-18": 24120
}
```

The values are stored in seconds.

You can delete this file if you want to reset the recorded usage.

## Run Automatically When Windows Starts

To make the tracker start automatically when you log into Windows, create a startup script.

Create:

```text
E:\Projects\laptop-time\start-tracker.cmd
```

with:

```bat
@echo off

cd /d E:\Projects\laptop-time

"C:\Program Files\nodejs\node.exe" index.js
```

### Check Your Node.js Location

Run:

```powershell
where.exe node
```

Example:

```text
C:\Program Files\nodejs\node.exe
```

If your Node.js executable is located somewhere else, update `start-tracker.cmd`.

For example:

```bat
@echo off

cd /d E:\Projects\laptop-time

"C:\Users\YourName\AppData\Local\Programs\nodejs\node.exe" index.js
```

## Create the Windows Scheduled Task

Open **PowerShell as Administrator**.

Run:

```powershell
schtasks /create `
  /tn "Laptop Time Tracker" `
  /tr "E:\Projects\laptop-time\start-tracker.cmd" `
  /sc onlogon `
  /rl limited `
  /f
```

You should get:

```text
SUCCESS: The scheduled task "Laptop Time Tracker" has successfully been created.
```

The task will now start automatically whenever you log into Windows.

## Test the Scheduled Task

You don't have to restart your computer.

Run:

```powershell
schtasks /run /tn "Laptop Time Tracker"
```

Then check whether Node is running:

```powershell
Get-Process node
```

## Check the Scheduled Task

```powershell
schtasks /query /tn "Laptop Time Tracker"
```

## Stop the Tracker

To stop the currently running Node process manually:

```powershell
Get-Process node | Stop-Process
```

If you have other Node.js applications running, **do not use this command**, because it will stop all Node.js processes.

Instead, find the specific process first:

```powershell
Get-Process node
```

## Disable Automatic Startup

To disable the scheduled task:

```powershell
schtasks /change `
  /tn "Laptop Time Tracker" `
  /disable
```

The task remains installed but won't start automatically.

## Re-enable Automatic Startup

```powershell
schtasks /change `
  /tn "Laptop Time Tracker" `
  /enable
```

## Completely Remove Automatic Startup

First disable it if necessary:

```powershell
schtasks /end /tn "Laptop Time Tracker"
```

Then delete the task:

```powershell
schtasks /delete `
  /tn "Laptop Time Tracker" `
  /f
```

## Troubleshooting

### `Access is denied`

If you get:

```text
ERROR: Access is denied.
```

when creating the scheduled task, open **PowerShell as Administrator** and run the command again.

You can also use the Windows Startup folder instead if you don't have administrator access:

```text
Win + R
```

then enter:

```text
shell:startup
```

Create a shortcut to:

```text
E:\Projects\laptop-time\start-tracker.cmd
```

### `Cannot find module`

If you get:

```text
Cannot find module 'E:\Projects\laptop-time\index.js'
```

make sure this file exists:

```text
E:\Projects\laptop-time\index.js
```

and that your `package.json` contains:

```json
{
  "scripts": {
    "start": "node index.js"
  }
}
```

### Tracker doesn't start after login

Check the scheduled task:

```powershell
schtasks /query /tn "Laptop Time Tracker" /v /fo list
```

Also test the script directly:

```powershell
E:\Projects\laptop-time\start-tracker.cmd
```

If that doesn't work, fix the `.cmd` file before troubleshooting Task Scheduler.

## Uninstall

To remove the project:

1. Stop the tracker.
2. Remove the scheduled task:

```powershell
schtasks /end /tn "Laptop Time Tracker"
schtasks /delete /tn "Laptop Time Tracker" /f
```

3. Delete the project directory:

```text
E:\Projects\laptop-time
```

## Privacy

Laptop Time stores tracking information locally.

It does not require:

- An account
- Internet access
- A cloud service
- Screenshots
- Keystroke logging
- Website tracking
- Application-content tracking

Only activity duration is recorded.

## License

Add your preferred license here.
