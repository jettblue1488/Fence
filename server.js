// ADB Dashboard — local backend
//
// This server does NOT talk raw ADB protocol itself. It shells out to the
// real `adb` binary that you already have installed, and simply gives you
// a nicer web UI over commands you could otherwise type by hand.
//
// Requirements:
//   - Android SDK platform-tools installed (`adb` on your PATH)
//   - Your device(s) already set up for wireless debugging and paired
//     (Settings > Developer options > Wireless debugging), OR connected via USB
//
// This tool only works against devices YOU control and have already
// authorized. It cannot bypass pairing, authorization prompts, or connect
// to a device that hasn't approved your machine's RSA key.

const express = require("express");
const { exec, execFile } = require("child_process");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4747;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Basic validation: IP:port or IP only
const HOST_RE = /^[a-zA-Z0-9.\-]+(:\d{1,5})?$/;
// Device serial as reported by `adb devices` (alnum, dots, colons, dashes)
const SERIAL_RE = /^[a-zA-Z0-9_.:\-]+$/;
// Pairing code is 6 digits
const PAIR_CODE_RE = /^\d{6}$/;

function runAdb(args, cb) {
  execFile("adb", args, { timeout: 15000 }, (err, stdout, stderr) => {
    if (err && !stdout && !stderr) {
      return cb(err.message || "adb command failed", null);
    }
    cb(null, (stdout || "") + (stderr || ""));
  });
}

// List currently visible/connected devices
app.get("/api/devices", (req, res) => {
  runAdb(["devices", "-l"], (err, output) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ output });
  });
});

// Connect to a device already in pairing/debugging mode on your network
// (standard `adb connect host:port`)
app.post("/api/connect", (req, res) => {
  const { host } = req.body;
  if (!host || !HOST_RE.test(host)) {
    return res.status(400).json({ error: "Invalid host. Use IP or IP:port." });
  }
  runAdb(["connect", host], (err, output) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ output });
  });
});

// Pair with a device using the 6-digit code shown on-device
// (Android 11+ "Pair device with pairing code" flow)
app.post("/api/pair", (req, res) => {
  const { host, code } = req.body;
  if (!host || !HOST_RE.test(host)) {
    return res.status(400).json({ error: "Invalid host. Use IP:port from the pairing screen." });
  }
  if (!code || !PAIR_CODE_RE.test(code)) {
    return res.status(400).json({ error: "Pairing code must be 6 digits." });
  }
  execFile("adb", ["pair", host, code], { timeout: 15000 }, (err, stdout, stderr) => {
    if (err && !stdout && !stderr) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ output: (stdout || "") + (stderr || "") });
  });
});

// Disconnect a device
app.post("/api/disconnect", (req, res) => {
  const { host } = req.body;
  if (!host || !HOST_RE.test(host)) {
    return res.status(400).json({ error: "Invalid host." });
  }
  runAdb(["disconnect", host], (err, output) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ output });
  });
});

// Whitelisted read-only / convenience commands only.
// This intentionally does NOT expose a raw "run any adb shell command" box,
// to keep this a device-management dashboard rather than a general remote
// shell to arbitrary targets.
const COMMANDS = {
  battery: (serial) => ["-s", serial, "shell", "dumpsys", "battery"],
  model: (serial) => ["-s", serial, "shell", "getprop", "ro.product.model"],
  androidVersion: (serial) => ["-s", serial, "shell", "getprop", "ro.build.version.release"],
  ip: (serial) => ["-s", serial, "shell", "ip", "addr", "show", "wlan0"],
  packages: (serial) => ["-s", serial, "shell", "pm", "list", "packages", "-3"],
  screenshot: (serial) => ["-s", serial, "shell", "screencap", "-p", "/sdcard/dashboard_shot.png"],
  reboot: (serial) => ["-s", serial, "reboot"],
};

app.post("/api/run", (req, res) => {
  const { serial, command } = req.body;
  if (!serial || !SERIAL_RE.test(serial)) {
    return res.status(400).json({ error: "Invalid or missing device serial." });
  }
  const build = COMMANDS[command];
  if (!build) {
    return res.status(400).json({ error: "Unknown command." });
  }
  runAdb(build(serial), (err, output) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ output });
  });
});

app.listen(PORT, () => {
  console.log(`ADB Dashboard running at http://localhost:${PORT}`);
  console.log(`Make sure 'adb' is installed and on your PATH.`);
});
