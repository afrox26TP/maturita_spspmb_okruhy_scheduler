const { app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, Tray } = require("electron");
const fs = require("fs");
const path = require("path");

const START = new Date(2026, 8, 7);
const DEADLINE = new Date(2027, 2, 3, 23, 59, 59);
const REMINDER_HOUR = 20;
const SETTINGS_FILE = "desktop-state.json";
const startHidden = process.argv.includes("--hidden");
const localAppDataPath = process.env.LOCALAPPDATA || app.getPath("appData");
const installedProgramsPath = path.join(localAppDataPath, "Programs").toLowerCase();
const isInstalledBuild = app.isPackaged && process.execPath.toLowerCase().startsWith(installedProgramsPath);

if (!isInstalledBuild) {
  app.setPath("userData", path.join(app.getPath("appData"), "Maturita 2027 Development"));
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

let mainWindow;
let tray;
let quitting = false;
let timer;
let pendingShow = false;
let progress = { subjects: {}, details: {} };
let desktopState = { lastDaily: "", lastWeekly: "" };

function statePath() {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

function loadDesktopState() {
  try {
    desktopState = { ...desktopState, ...JSON.parse(fs.readFileSync(statePath(), "utf8")) };
    progress = desktopState.progress || progress;
  } catch {
    // Soubor při prvním spuštění ještě neexistuje.
  }
}

function saveDesktopState() {
  desktopState.progress = progress;
  fs.writeFileSync(statePath(), JSON.stringify(desktopState, null, 2), "utf8");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 780,
    minWidth: 1000,
    minHeight: 620,
    show: !startHidden,
    backgroundColor: "#f5f6f7",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "desktop.html")).catch(error => {
    console.error("Nepodařilo se načíst hlavní okno aplikace:", error);
  });
  mainWindow.on("close", event => {
    if (!quitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function showWindow() {
  if (!app.isReady()) {
    pendingShow = true;
    return;
  }
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  pendingShow = false;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

async function createTray() {
  let image = await app.getFileIcon(process.execPath, { size: "small" });
  if (image.isEmpty()) image = nativeImage.createFromPath(path.join(__dirname, "icon.svg"));
  tray = new Tray(image.resize({ width: 16, height: 16 }));
  tray.setToolTip("Maturita 2027");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Otevřít plán", click: showWindow },
    { label: "Vyzkoušet připomínku", click: () => showReminder(true) },
    { type: "separator" },
    { label: "Ukončit", click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on("click", showWindow);
  tray.on("double-click", showWindow);
}

function currentWeekNumber(now = new Date()) {
  if (now < START) return 1;
  if (now > DEADLINE) return 26;
  return Math.min(26, Math.floor((now - START) / (7 * 86_400_000)) + 1);
}

function isSubjectDone(week, subject) {
  return Boolean(progress.subjects?.[`${week}-${subject}`]);
}

function unfinishedPastWeeks(currentWeek) {
  let count = 0;
  for (let week = 1; week < Math.min(currentWeek, 26); week += 1) {
    if (!isSubjectDone(week, "program")) count += 1;
    if (!isSubjectDone(week, "network")) count += 1;
  }
  return count;
}

function notificationText(now = new Date(), test = false) {
  const week = currentWeekNumber(now);
  const programDone = week < 26 && isSubjectDone(week, "program");
  const networkDone = week < 26 && isSubjectDone(week, "network");
  const remaining = Number(!programDone) + Number(!networkDone);
  const overdue = unfinishedPastWeeks(week);

  if (week === 26) return "Finální tři dny: vylosuj si otázku a udělej simulaci maturity.";
  if (now > DEADLINE) return "Plán dosáhl cílového data. Zkontroluj výsledný postup.";

  let text = remaining === 0
    ? `Týden ${week}: oba okruhy jsou hotové. Dnes stačí krátké opakování.`
    : `Týden ${week}: zbývá dokončit ${remaining === 1 ? "1 okruh" : "2 okruhy"}.`;
  if (overdue > 0) text += ` Ve starších týdnech čeká ${overdue} ${overdue === 1 ? "okruh" : overdue < 5 ? "okruhy" : "okruhů"}.`;
  if (test) text = `Test připomínky · ${text}`;
  return text;
}

function showReminder(test = false, weekly = false) {
  if (!Notification.isSupported()) return false;
  const title = weekly ? "Plán na nový týden" : "Maturita 2027 · čas na přípravu";
  const notification = new Notification({ title, body: notificationText(new Date(), test), silent: false });
  notification.on("click", showWindow);
  notification.show();
  return true;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function checkReminders() {
  const now = new Date();
  if (now > DEADLINE || now < START) return;
  const today = dateKey(now);
  if (now.getHours() === REMINDER_HOUR && desktopState.lastDaily !== today) {
    const weekly = now.getDay() === 1 && desktopState.lastWeekly !== today;
    showReminder(false, weekly);
    desktopState.lastDaily = today;
    if (weekly) desktopState.lastWeekly = today;
    saveDesktopState();
  }
}

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    pendingShow = true;
    showWindow();
  });
}

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return;
  app.setAppUserModelId("cz.maturita.plan2027");
  loadDesktopState();
  createWindow();
  await createTray();
  if (isInstalledBuild) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: ["--hidden"]
    });
  }
  if (startHidden && !pendingShow) mainWindow.hide();
  else showWindow();
  checkReminders();
  timer = setInterval(checkReminders, 30_000);
});

app.on("activate", showWindow);
app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  quitting = true;
  clearInterval(timer);
});

ipcMain.on("progress:update", (_event, nextProgress) => {
  if (nextProgress && typeof nextProgress === "object") {
    progress = nextProgress;
    saveDesktopState();
  }
});

ipcMain.handle("reminder:test", () => showReminder(true));
ipcMain.handle("reminder:settings", () => ({
  hour: `${String(REMINDER_HOUR).padStart(2, "0")}:00`,
  daily: true,
  weekly: true,
  overdue: true,
  openAtLogin: app.getLoginItemSettings().openAtLogin
}));
