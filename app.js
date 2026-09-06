const programs = [
  "Algoritmizace a složitost algoritmů",
  "Základy programování v Pythonu",
  "Základní struktury v Pythonu",
  "Iterátory a generátory v Pythonu",
  "Objektově orientované programování",
  "Kolekce a práce s iteracemi",
  "Formátování textu, řetězce a regulární výrazy",
  "Funkce",
  "Práce se soubory",
  "Výjimky, ladění a kontrola kódu",
  "Práce s databází",
  "Moduly, knihovny a PIP",
  "Vlákna, procesy a asynchronní programování",
  "Dekorátory a typové anotace",
  "Návrhové vzory",
  "Tvorba webových aplikací pomocí Flasku",
  "Okenní aplikace a PyQt",
  "Síťové programování v Pythonu",
  "Práce s daty pomocí NumPy a Pandas",
  "Vizualizace dat pomocí Matplotlib a Seaborn",
  "Deployment aplikací a právní aspekty vývoje",
  "Správa verzí, Git a GitHub",
  "Umělá inteligence v Pythonu",
  "Automatizace úloh",
  "Zabezpečení aplikací"
];

const outputs = [
  "Praktická ukázka třídění a vyhledávání", "Program se vstupem a výstupem",
  "Ukázka typů, podmínek a cyklů", "Vlastní iterátor a generátor",
  "Třídy, dědičnost a polymorfismus", "Srovnání list, tuple, set a dict",
  "Regulární výraz a práce s textem", "Argumenty, lambda a rekurze",
  "Čtení a zápis TXT, CSV a JSON", "Výjimka a jednoduchý unit test",
  "Návrh tabulky a základní SQL dotazy", "Modul, balíček a virtuální prostředí",
  "Srovnání thread, process a async", "Vlastní dekorátor a anotovaná funkce",
  "Schéma MVC a ukázka jednoho vzoru", "Minimální Flask aplikace",
  "Jednoduché okno s tlačítkem", "TCP klient/server nebo REST požadavek",
  "Načtení, filtrování a agregace dat", "Alespoň dva různé grafy",
  "Schéma nasazení a srovnání licencí", "Praktická ukázka Git workflow",
  "Jednoduché trénování modelu", "Krátký automatizační skript",
  "Přehled útoků a odpovídajících ochran"
];

const start = new Date(2026, 8, 7);
const deadline = new Date(2027, 2, 3, 23, 59, 59);
const oneDay = 86_400_000;
const detailTasks = ["Projít všechny podotázky", "Vytvořit tahák na 1–2 strany", "Připravit příklad nebo schéma", "Odříkat téma 8–10 minut"];
const storageKey = "maturita-2027-progress-v1";
const themeKey = "maturita-2027-theme";

const weeks = Array.from({ length: 26 }, (_, index) => {
  const from = new Date(start.getTime() + index * 7 * oneDay);
  const to = index === 25 ? deadline : new Date(from.getTime() + 6 * oneDay);
  return {
    index: index + 1,
    from,
    to,
    program: index < 25 ? programs[index] : "Závěrečné opakování všech okruhů",
    network: index < 25 ? `Síťový okruh ${index + 1}` : "Závěrečné opakování všech okruhů",
    output: index < 25 ? outputs[index] : "Tři simulace maturity a oprava slabých míst",
    final: index === 25
  };
});

let state = loadState();
let activeFilter = "all";
let searchTerm = "";
let view = "compact";

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || { subjects: {}, details: {} };
  } catch {
    return { subjects: {}, details: {} };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  window.desktop?.syncProgress(state);
  updateDashboard();
  renderWeeks();
  renderCurrentFocus();
  renderMilestones();
}

function dateText(date) {
  return new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }).format(date);
}

function shortRange(week) {
  const from = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric" }).format(week.from);
  const to = dateText(week.to);
  return `${from}–${to}`;
}

function getCurrentWeek() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (today < start) return weeks[0];
  if (today > deadline) return weeks[25];
  const index = Math.min(25, Math.floor((today - start) / (7 * oneDay)));
  return weeks[index];
}

function subjectDone(weekIndex, subject) {
  return Boolean(state.subjects?.[`${weekIndex}-${subject}`]);
}

function weekDone(week) {
  if (week.final) return subjectDone(week.index, "final");
  return subjectDone(week.index, "program") && subjectDone(week.index, "network");
}

function completedSubjects() {
  return weeks.slice(0, 25).reduce((total, week) => total + Number(subjectDone(week.index, "program")) + Number(subjectDone(week.index, "network")), 0);
}

function updateDashboard() {
  const completed = completedSubjects();
  const percent = Math.round(completed / 50 * 100);
  document.querySelector("#progress-percent").textContent = `${percent} %`;
  document.querySelector("#progress-bar").style.width = `${percent}%`;
  document.querySelector("#progress-detail").textContent = `${completed} z 50 okruhů hotovo`;
  document.querySelector("#completed-count").textContent = completed;

  const now = new Date();
  const days = Math.max(0, Math.ceil((deadline - now) / oneDay));
  document.querySelector("#days-left").textContent = now > deadline ? "Dokončeno" : `${days} dní`;
  document.querySelector("#days-caption").textContent = now > deadline ? "cílové datum uplynulo" : "do cílového data";

  const current = getCurrentWeek();
  document.querySelector("#current-week").textContent = current.final ? "Finále" : `${current.index}. / 25`;
  document.querySelector("#current-week-dates").textContent = shortRange(current);
}

function focusTopic(week, subject, label, title) {
  const key = week.final ? "final" : subject;
  const checked = subjectDone(week.index, key);
  return `<div class="focus-topic">
    <span class="subject-label ${subject === "network" ? "network" : ""}">${label}</span>
    <h3>${title}</h3>
    <label class="checkline"><input type="checkbox" data-subject="${key}" data-week="${week.index}" ${checked ? "checked" : ""}> ${checked ? "Hotovo — skvělá práce" : "Označit okruh jako hotový"}</label>
  </div>`;
}

function renderCurrentFocus() {
  const week = getCurrentWeek();
  const content = week.final
    ? `<div class="focus-number"><span>Finiš</span><strong>3×</strong><span>simulace</span></div>${focusTopic(week, "program", "Závěrečná příprava", week.program)}<div class="focus-topic"><span class="subject-label network">Výstup</span><h3>${week.output}</h3><p class="checkline">Losuj otázky z obou předmětů a opravuj slabá místa.</p></div>`
    : `<div class="focus-number"><span>Týden</span><strong>${String(week.index).padStart(2, "0")}</strong><span>${shortRange(week)}</span></div>${focusTopic(week, "program", "Programování", `${week.index}. ${week.program}`)}${focusTopic(week, "network", "Počítačové sítě", week.network)}`;
  document.querySelector("#current-focus").innerHTML = content;
}

function weekMatches(week, current) {
  const searchable = `${week.program} ${week.network} ${week.output}`.toLocaleLowerCase("cs");
  if (!searchable.includes(searchTerm)) return false;
  if (activeFilter === "done") return weekDone(week);
  if (activeFilter === "todo") return !weekDone(week);
  if (activeFilter === "active") return week.index === current.index;
  return true;
}

function topicMarkup(week, subject, label, title) {
  const key = week.final ? "final" : subject;
  const checked = subjectDone(week.index, key);
  return `<label class="topic ${subject}">
    <span class="topic-dot"></span>
    <span><small>${label}</small><span class="topic-title">${title}</span></span>
    <input type="checkbox" data-subject="${key}" data-week="${week.index}" aria-label="Označit ${label} jako hotové" ${checked ? "checked" : ""}>
  </label>`;
}

function detailsMarkup(week) {
  const labels = week.final ? ["Simulace 1", "Simulace 2", "Simulace 3", "Seznam slabých míst"] : detailTasks;
  return `<div class="week-details">
    <strong>Kontrolní výstup</strong>
    <p>${week.output}</p>
    ${labels.map((label, i) => {
      const key = `${week.index}-${i}`;
      return `<label class="checkline"><input type="checkbox" data-detail="${key}" ${state.details?.[key] ? "checked" : ""}> ${label}</label>`;
    }).join("")}
  </div>`;
}

function renderWeeks() {
  const current = getCurrentWeek();
  const visible = weeks.filter(week => weekMatches(week, current));
  const grid = document.querySelector("#weeks-grid");
  grid.className = `weeks-grid ${view === "compact" ? "compact" : ""}`;
  grid.innerHTML = visible.map(week => `<article class="week-card ${week.index === current.index ? "current" : ""} ${weekDone(week) ? "done" : ""}" id="week-${week.index}">
      <div class="week-head">
        <div class="week-index"><strong>${String(week.index).padStart(2, "0")}</strong><span><b>${week.final ? "Závěr" : `Týden ${week.index}`}</b>${shortRange(week)}</span></div>
        ${week.index === current.index ? '<span class="current-pill">Teď</span>' : ""}
      </div>
      <div class="week-body">
        ${topicMarkup(week, "program", week.final ? "Opakování" : "Programování", week.program)}
        ${week.final ? "" : topicMarkup(week, "network", "Sítě", week.network)}
      </div>
      <button type="button" class="week-toggle" aria-expanded="false">Detaily a checklist ＋</button>
      ${detailsMarkup(week)}
    </article>`).join("");

  document.querySelector("#empty-state").hidden = visible.length > 0;
  const done = weeks.filter(weekDone).length;
  document.querySelector("#count-all").textContent = weeks.length;
  document.querySelector("#count-active").textContent = "1";
  document.querySelector("#count-todo").textContent = weeks.length - done;
  document.querySelector("#count-done").textContent = done;
}

const milestonesData = [
  ["Září", "30. 9. 2026", 4], ["Říjen", "31. 10. 2026", 8],
  ["Listopad", "30. 11. 2026", 12], ["Prosinec", "31. 12. 2026", 16],
  ["Leden", "31. 1. 2027", 21], ["Únor", "28. 2. 2027", 25],
  ["Finále", "3. 3. 2027", 26]
];

function renderMilestones() {
  const completedWeeks = weeks.filter(weekDone).length;
  document.querySelector("#milestones").innerHTML = milestonesData.map(([name, date, target]) => `<article class="milestone ${completedWeeks >= target ? "achieved" : ""}">
    <strong>${name}</strong><span>${date}</span><b>${target === 26 ? "3 simulace" : `${target * 2} okruhů`}</b>
  </article>`).join("");
}

function setSubject(checkbox) {
  state.subjects ||= {};
  state.subjects[`${checkbox.dataset.week}-${checkbox.dataset.subject}`] = checkbox.checked;
  saveState();
}

function setDetail(checkbox) {
  state.details ||= {};
  state.details[checkbox.dataset.detail] = checkbox.checked;
  localStorage.setItem(storageKey, JSON.stringify(state));
}

document.addEventListener("change", event => {
  if (event.target.matches("[data-subject]")) setSubject(event.target);
  if (event.target.matches("[data-detail]")) setDetail(event.target);
});

document.addEventListener("click", event => {
  const toggle = event.target.closest(".week-toggle");
  if (toggle) {
    const card = toggle.closest(".week-card");
    card.classList.toggle("open");
    const open = card.classList.contains("open");
    toggle.textContent = open ? "Skrýt detaily −" : "Detaily a checklist ＋";
    toggle.setAttribute("aria-expanded", String(open));
  }
});

document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
  renderWeeks();
}));

document.querySelector("#search-input").addEventListener("input", event => {
  searchTerm = event.target.value.trim().toLocaleLowerCase("cs");
  renderWeeks();
});

document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
  view = button.dataset.view;
  document.querySelectorAll("[data-view]").forEach(item => item.classList.toggle("active", item === button));
  renderWeeks();
}));

document.querySelector("#jump-current").addEventListener("click", () => {
  activeFilter = "all";
  searchTerm = "";
  document.querySelector("#search-input").value = "";
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item.dataset.filter === "all"));
  renderWeeks();
  document.querySelector(`#week-${getCurrentWeek().index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
});

const resetDialog = document.querySelector("#reset-dialog");
document.querySelector(".reset-button").addEventListener("click", () => resetDialog.showModal());
document.querySelector("#confirm-reset").addEventListener("click", () => {
  state = { subjects: {}, details: {} };
  localStorage.removeItem(storageKey);
  updateDashboard(); renderWeeks(); renderCurrentFocus(); renderMilestones();
});

const savedTheme = localStorage.getItem(themeKey);
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
  document.body.classList.add("dark");
}
document.querySelector(".theme-toggle").addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem(themeKey, dark ? "dark" : "light");
});

if (window.desktop?.isDesktop) {
  const reminderButton = document.querySelector("#test-reminder");
  reminderButton.hidden = false;
  reminderButton.addEventListener("click", async () => {
    const shown = await window.desktop.showTestReminder();
    reminderButton.textContent = shown ? "✓ Upozornění odesláno" : "Upozornění nejsou dostupná";
    setTimeout(() => { reminderButton.textContent = "🔔 Připomínky 20:00"; }, 2500);
  });
  window.desktop.syncProgress(state);
}

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "long",
  year: "numeric"
}).format(new Date());

updateDashboard();
renderCurrentFocus();
renderWeeks();
renderMilestones();
