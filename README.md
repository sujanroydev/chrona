# Chrona

A small Windows desktop app that automatically tracks active usage.

## What it tracks

- Keyboard/mouse activity
- Idle periods
- Daily usage
- Yesterday's usage
- Last 7 days
- Automatic Windows startup

It does not track websites, keystrokes, screenshots, or application contents.

## Development

```powershell
pnpm install
pnpm start
```

## Build Windows installer

```powershell
pnpm build
```

The installer will be generated in `dist/`.

## Notes

This first version uses Electron for a normal Windows application experience. Electron is heavier than a native Windows application, so a later version could move the UI to Tauri/WinUI if minimum RAM/disk usage becomes the priority.
