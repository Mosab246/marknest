import { useCallback, useEffect, useState } from "react";
import { Database, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  backupDatabase,
  getAppSettings,
  getCaptureBridgeStatus,
  isAutostartEnabled,
  saveAppSettings,
  saveExportJson,
} from "@/lib/api";
import type { AppSettings, CaptureBridgeStatus } from "@/lib/types";

function bridgeStatusLabel(bridge: CaptureBridgeStatus | null): string {
  if (!bridge) return "Checking…";
  if (bridge.running) return "Running";
  if (bridge.lastError) return "Error";
  return "Offline";
}

function bridgeStatusClass(bridge: CaptureBridgeStatus | null): string {
  if (!bridge) return "text-muted-foreground";
  if (bridge.running) return "text-green-500";
  if (bridge.lastError) return "text-red-500";
  return "text-amber-500";
}

export function SettingsView() {
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [bridge, setBridge] = useState<CaptureBridgeStatus | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [osAutostart, setOsAutostart] = useState<boolean | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const refreshBridge = useCallback(async () => {
    try {
      const status = await getCaptureBridgeStatus();
      setBridge(status);
    } catch {
      setBridge({ running: false, port: 4763, lastError: "Unable to read status" });
    }
    setLastChecked(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    refreshBridge();
    const interval = setInterval(refreshBridge, 5000);
    return () => clearInterval(interval);
  }, [refreshBridge]);

  useEffect(() => {
    getAppSettings().then(setSettings).catch(() => null);
    isAutostartEnabled()
      .then(setOsAutostart)
      .catch(() => setOsAutostart(null));
  }, []);

  const updateSetting = async (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSavingSettings(true);
    setMessage(null);
    try {
      await saveAppSettings(next);
      setSettings(next);
      const enabled = await isAutostartEnabled();
      setOsAutostart(enabled);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    setMessage(null);
    try {
      const path = await backupDatabase();
      setMessage(`Database copied to ${path}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBackingUp(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const path = await saveExportJson();
      setMessage(`Exported to ${path}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  const port = bridge?.port ?? 4763;

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            MarkNest v0.2.0 — local-first capture library. UI layout inspired by
            Readwise Reader; not affiliated with Readwise.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Startup &amp; tray</CardTitle>
            <CardDescription>
              Start MarkNest with Windows so the browser extension can save anytime.
              Closing the window minimizes to the tray; use Quit in the tray menu to
              fully exit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={settings?.startWithWindows ?? false}
                disabled={!settings || savingSettings}
                onChange={(e) => updateSetting({ startWithWindows: e.target.checked })}
              />
              <span>
                <span className="font-medium">Start with Windows</span>
                <span className="mt-0.5 block text-muted-foreground">
                  Registers MarkNest in Windows startup. Windows may ask for approval
                  the first time you enable this.
                  {osAutostart === true && " (enabled in Windows)"}
                  {osAutostart === false && settings?.startWithWindows && " (syncing…)"}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={settings?.startMinimizedToTray ?? false}
                disabled={!settings || savingSettings}
                onChange={(e) => updateSetting({ startMinimizedToTray: e.target.checked })}
              />
              <span>
                <span className="font-medium">Start minimized to tray</span>
                <span className="mt-0.5 block text-muted-foreground">
                  On launch, hide the main window and keep the capture bridge running
                  in the background.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={settings?.closeToTray ?? true}
                disabled={!settings || savingSettings}
                onChange={(e) => updateSetting({ closeToTray: e.target.checked })}
              />
              <span>
                <span className="font-medium">Close window to tray</span>
                <span className="mt-0.5 block text-muted-foreground">
                  When enabled, the X button hides MarkNest instead of quitting. Use
                  tray → Quit MarkNest to stop the app and bridge.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Local capture bridge</CardTitle>
            <CardDescription>
              The Chrome extension saves pages through a local HTTP server inside
              MarkNest. Data never leaves your machine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Status:{" "}
              <span className={bridgeStatusClass(bridge)}>
                {bridgeStatusLabel(bridge)}
              </span>
            </p>
            <p>
              Endpoint:{" "}
              <code className="rounded bg-muted px-1 text-xs">
                http://127.0.0.1:{port}
              </code>
            </p>
            {lastChecked && (
              <p className="text-muted-foreground">Last checked: {lastChecked}</p>
            )}
            {bridge?.lastError && (
              <p className="text-muted-foreground">{bridge.lastError}</p>
            )}
            <p className="text-muted-foreground">
              Keep MarkNest running or minimized to tray for extension capture. If the
              port is in use, restart MarkNest or free port {port}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chrome extension</CardTitle>
            <CardDescription>
              Save the current tab, selected text, or tweets to MarkNest from your
              browser. No X/Twitter API is used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Open{" "}
                <code className="rounded bg-muted px-1 text-xs">chrome://extensions</code>
              </li>
              <li>Enable Developer mode</li>
              <li>Click Load unpacked</li>
              <li>
                Select the{" "}
                <code className="rounded bg-muted px-1 text-xs">extension</code> folder
                in this project
              </li>
              <li>
                Keep MarkNest running (or in the tray), then use the toolbar icon or
                Ctrl+Shift+M
              </li>
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">
              If saving fails, the extension shows: &quot;MarkNest not running — Open
              MarkNest or start it from the tray, then try again.&quot;
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
            <CardDescription>
              Download all bookmarks, tags, and folders as JSON.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exporting…" : "Export JSON"}
            </Button>
            {message && (
              <p className="mt-3 text-sm text-muted-foreground">{message}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Local database</CardTitle>
            <CardDescription>
              All data is stored in a SQLite file on your machine. The app works
              fully offline. On Windows, the database is typically at{" "}
              <code className="rounded bg-muted px-1 text-xs">
                %APPDATA%\com.marknest.app\marknest.db
              </code>
              . App settings are stored as{" "}
              <code className="rounded bg-muted px-1 text-xs">settings.json</code> in
              the same folder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleBackup} disabled={backingUp}>
              <Database className="mr-2 h-4 w-4" />
              {backingUp ? "Copying…" : "Backup database"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Future features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>JSON import</li>
              <li>Optional AI summaries and auto-tagging</li>
              <li>Backup and sync options</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
