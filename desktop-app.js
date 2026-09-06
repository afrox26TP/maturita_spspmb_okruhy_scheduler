const programs = [
  "Algoritmizace a složitost algoritmů", "Základy programování v Pythonu",
  "Základní struktury v Pythonu", "Iterátory a generátory v Pythonu",
  "Objektově orientované programování", "Kolekce a práce s iteracemi",
  "Formátování textu, řetězce a regulární výrazy", "Funkce", "Práce se soubory",
  "Výjimky, ladění a kontrola kódu", "Práce s databází", "Moduly, knihovny a PIP",
  "Vlákna, procesy a asynchronní programování", "Dekorátory a typové anotace",
  "Návrhové vzory", "Tvorba webových aplikací pomocí Flasku", "Okenní aplikace a PyQt",
  "Síťové programování v Pythonu", "Práce s daty pomocí NumPy a Pandas",
  "Vizualizace dat pomocí Matplotlib a Seaborn", "Deployment aplikací a právní aspekty vývoje",
  "Správa verzí, Git a GitHub", "Umělá inteligence v Pythonu", "Automatizace úloh",
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
const dayMs = 86_400_000;
const storageKey = "maturita-2027-progress-v1";
const themeKey = "maturita-2027-theme";
const fallbackChecklist = ["Projít teorii", "Vytvořit stručný tahák", "Připravit praktický příklad", "Odříkat téma 8–10 minut"];

const weeks = Array.from({ length: 26 }, (_, index) => {
  const from = new Date(start.getTime() + index * 7 * dayMs);
  const to = index === 25 ? deadline : new Date(from.getTime() + 6 * dayMs);
  return {
    index: index + 1, from, to, final: index === 25,
    program: index < 25 ? programs[index] : "Závěrečné opakování všech okruhů",
    network: index < 25 ? `Síťový okruh ${index + 1}` : "Tři simulace maturity",
    output: index < 25 ? outputs[index] : "Tři simulace maturity a oprava posledních slabých míst"
  };
});

let state = loadState();
let selectedWeek = getCurrentWeek().index;
let activeFilter = "all";
let searchTerm = "";
let topicDocuments = { program: [], network: [] };
const openGroups = new Set();

function parseTopicDocument(markdown) {
  const topics = [];
  let topic = null;
  let section = null;
  let lastQuestion = null;

  for (const rawLine of markdown.replaceAll("\r", "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const topicMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (topicMatch) {
      topic = { number: Number(topicMatch[1]), title: topicMatch[2], sections: [] };
      topics.push(topic);
      section = null;
      lastQuestion = null;
      continue;
    }
    if (!topic) continue;
    if (line.startsWith("•")) {
      section = { title: line.slice(1).trim(), questions: [] };
      topic.sections.push(section);
      lastQuestion = null;
      continue;
    }
    if (/^o\s+/.test(line)) {
      section ||= { title: "Podotázky", questions: [] };
      if (!topic.sections.includes(section)) topic.sections.push(section);
      lastQuestion = line.replace(/^o\s+/, "").trim();
      section.questions.push(lastQuestion);
      continue;
    }
    if (lastQuestion && section?.questions.length) {
      section.questions[section.questions.length - 1] += ` ${line}`;
      lastQuestion = section.questions.at(-1);
    }
  }
  return topics;
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || { subjects: {}, details: {} }; }
  catch { return { subjects: {}, details: {} }; }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  window.desktop?.syncProgress(state);
  render();
}

function formatDate(date, options = { day: "numeric", month: "numeric", year: "numeric" }) {
  return new Intl.DateTimeFormat("cs-CZ", options).format(date);
}

function weekRange(week) {
  return `${formatDate(week.from, { day: "numeric", month: "short" })} – ${formatDate(week.to, { day: "numeric", month: "short", year: "numeric" })}`;
}

function getCurrentWeek() {
  const now = new Date();
  if (now < start) return weeks[0];
  if (now > deadline) return weeks[25];
  return weeks[Math.min(25, Math.floor((now - start) / (7 * dayMs)))];
}

function subjectDone(week, subject) { return Boolean(state.subjects?.[`${week}-${subject}`]); }
function weekDone(week) { return week.final ? subjectDone(week.index, "final") : subjectDone(week.index, "program") && subjectDone(week.index, "network"); }
function completedSubjects() { return weeks.slice(0, 25).reduce((sum, week) => sum + Number(subjectDone(week.index, "program")) + Number(subjectDone(week.index, "network")), 0); }

function sectionsFor(week, subject) {
  if (week.final) return [{ title: "Závěrečné simulace", questions: ["Simulace 1", "Simulace 2", "Simulace 3", "Sepsat a opravit slabá místa"] }];
  const topic = topicDocuments[subject]?.find(item => item.number === week.index);
  if (topic?.sections?.some(section => section.questions.length)) return topic.sections.filter(section => section.questions.length);
  return [{ title: subject === "network" ? "Síťový okruh zatím nemá doplněné podotázky" : "Příprava okruhu", questions: fallbackChecklist }];
}

function taskKey(week, subject, sectionIndex, questionIndex) {
  return `topic-${week.index}-${subject}-${sectionIndex}-${questionIndex}`;
}

function taskKeysFor(week, subject) {
  return sectionsFor(week, subject).flatMap((section, sectionIndex) => section.questions.map((_question, questionIndex) => taskKey(week, subject, sectionIndex, questionIndex)));
}

function setSubjectState(week, subject, done) {
  state.subjects ||= {};
  state.details ||= {};
  const key = week.final ? "final" : subject;
  state.subjects[`${week.index}-${key}`] = done;
  taskKeysFor(week, subject).forEach(task => { state.details[task] = done; });
}

function syncSubjectFromTasks(week, subject) {
  const keys = taskKeysFor(week, subject);
  const key = week.final ? "final" : subject;
  state.subjects ||= {};
  state.subjects[`${week.index}-${key}`] = keys.length > 0 && keys.every(task => state.details?.[task]);
}

function statusFor(week) {
  if (weekDone(week)) return ["Hotovo", "complete"];
  if (week.index === getCurrentWeek().index) return ["Probíhá", "active"];
  return ["Čeká", ""];
}

function renderSummary() {
  const completed = completedSubjects();
  const percent = Math.round(completed / 50 * 100);
  document.querySelector("#progress-percent").textContent = `${percent}%`;
  document.querySelector("#progress-detail").textContent = `${completed} / 50`;
  document.querySelector("#progress-ring").style.setProperty("--progress", `${percent}%`);
  const remainingDays = Math.max(0, Math.ceil((deadline - new Date()) / dayMs));
  document.querySelector("#days-left").textContent = `${remainingDays} dní zbývá`;
  const done = weeks.filter(weekDone).length;
  document.querySelector("#count-all").textContent = weeks.length;
  document.querySelector("#count-todo").textContent = weeks.length - done;
  document.querySelector("#count-done").textContent = done;
}

function renderMiniCalendar() {
  const week = weeks[selectedWeek - 1];
  const monthDate = week.from;
  document.querySelector("#mini-month-title").textContent = formatDate(monthDate, { month: "long", year: "numeric" });
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const todayKey = formatDate(new Date());
  const selectedFrom = week.from.getTime();
  const selectedTo = week.to.getTime();
  document.querySelector("#month-days").innerHTML = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getTime() + i * dayMs);
    const outside = date.getMonth() !== month;
    const inPlan = date >= start && date <= deadline;
    const selected = date.getTime() >= selectedFrom && date.getTime() <= selectedTo;
    const today = formatDate(date) === todayKey;
    return `<button type="button" class="month-day ${outside ? "outside" : ""} ${inPlan ? "in-plan" : ""} ${selected ? "selected" : ""} ${today ? "today" : ""}" data-date="${date.toISOString()}">${date.getDate()}</button>`;
  }).join("");
}

function visibleWeeks() {
  const current = getCurrentWeek();
  return weeks.filter(week => {
    const text = `${week.program} ${week.network} ${week.output}`.toLocaleLowerCase("cs");
    if (!text.includes(searchTerm)) return false;
    if (activeFilter === "active") return week.index === current.index;
    if (activeFilter === "todo") return !weekDone(week);
    if (activeFilter === "done") return weekDone(week);
    return true;
  });
}

function eventMarkup(week, subject, title) {
  const key = week.final ? "final" : subject;
  return `<label class="event ${subject}" onclick="event.stopPropagation()">
    <i class="event-bar"></i><span class="event-text"><small class="event-type">${subject === "program" ? "Programování" : "Sítě"}</small><b class="event-title">${title}</b></span>
    <input type="checkbox" data-subject="${key}" data-week="${week.index}" ${subjectDone(week.index, key) ? "checked" : ""}>
  </label>`;
}

function renderWeeks() {
  const current = getCurrentWeek();
  const visible = visibleWeeks();
  document.querySelector("#weeks-grid").innerHTML = visible.map(week => {
    const [status, statusClass] = statusFor(week);
    return `<article class="week-row ${week.index === selectedWeek ? "selected" : ""} ${week.index === current.index ? "current" : ""} ${weekDone(week) ? "done" : ""}" data-select-week="${week.index}" id="week-${week.index}">
      <div class="week-cell week-date"><span class="week-number">${week.index}</span><div><strong>${week.final ? "Finále" : `Týden ${week.index}`}</strong><span>${weekRange(week)}</span>${week.index === current.index ? '<span class="now-label">Tento týden</span>' : ""}</div></div>
      <div class="week-cell">${eventMarkup(week, "program", week.program)}</div>
      <div class="week-cell">${week.final ? '<span class="event-title">Závěrečná příprava</span>' : eventMarkup(week, "network", week.network)}</div>
      <div class="week-cell status"><span class="status-pill ${statusClass}">${status}</span></div>
    </article>`;
  }).join("");
  document.querySelector("#empty-state").hidden = visible.length > 0;
}

function detailSubject(week, subject, label, title) {
  const key = week.final ? "final" : subject;
  return `<label class="detail-subject"><i class="event-bar"></i><span><small>${label}</small><strong>${title}</strong></span><input type="checkbox" data-subject="${key}" data-week="${week.index}" ${subjectDone(week.index, key) ? "checked" : ""}></label>`;
}

function renderDetail() {
  const week = weeks[selectedWeek - 1];
  const [status, statusClass] = statusFor(week);
  const subjectTotal = week.final ? 1 : 2;
  const subjectCompleted = week.final ? Number(subjectDone(week.index, "final")) : Number(subjectDone(week.index, "program")) + Number(subjectDone(week.index, "network"));
  const percent = Math.round(subjectCompleted / subjectTotal * 100);
  document.querySelector("#detail-eyebrow").textContent = week.index === getCurrentWeek().index ? "Aktuální týden" : "Vybraný týden";
  document.querySelector("#detail-title").textContent = week.final ? "Závěrečné opakování" : `Týden ${week.index}`;
  document.querySelector("#detail-dates").textContent = weekRange(week);
  const stateElement = document.querySelector("#detail-state");
  stateElement.textContent = status;
  stateElement.className = `week-state ${statusClass}`;
  document.querySelector("#detail-progress-label").textContent = `${subjectCompleted} ze ${subjectTotal} hotovo`;
  document.querySelector("#detail-progress-percent").textContent = `${percent}%`;
  document.querySelector("#detail-progress-bar").style.width = `${percent}%`;
  document.querySelector("#detail-subjects").innerHTML = week.final
    ? detailSubject(week, "program", "Finále", week.program)
    : detailSubject(week, "program", "Programování", week.program) + detailSubject(week, "network", "Počítačové sítě", week.network);
  const subjects = week.final ? ["program"] : ["program", "network"];
  let totalTasks = 0;
  let completedTasks = 0;
  document.querySelector("#detail-checklist").innerHTML = subjects.map(subject => {
    const sections = sectionsFor(week, subject);
    const subjectLabel = week.final ? "Závěrečná příprava" : subject === "program" ? "Programování" : "Počítačové sítě";
    const groups = sections.map((section, sectionIndex) => {
      const keys = section.questions.map((_question, questionIndex) => taskKey(week, subject, sectionIndex, questionIndex));
      const doneCount = keys.filter(key => state.details?.[key]).length;
      totalTasks += keys.length;
      completedTasks += doneCount;
      const groupId = `${week.index}-${subject}-${sectionIndex}`;
      const isOpen = openGroups.has(groupId) || (sectionIndex === 0 && subject === subjects[0]);
      return `<details class="subtask-group" data-group-id="${groupId}" ${isOpen ? "open" : ""}>
        <summary><strong>${section.title}</strong><span>${doneCount}/${keys.length}</span><button type="button" class="group-complete" data-complete-group="${subject}" data-section="${sectionIndex}">${doneCount === keys.length ? "Zrušit vše" : "Splnit vše"}</button></summary>
        <div class="subtask-list">${section.questions.map((question, questionIndex) => {
          const key = taskKey(week, subject, sectionIndex, questionIndex);
          return `<label class="detail-check"><input type="checkbox" data-topic-task="${key}" data-task-subject="${subject}" ${state.details?.[key] ? "checked" : ""}><span>${question}</span></label>`;
        }).join("")}</div>
      </details>`;
    }).join("");
    return `<div class="subject-divider">${subjectLabel}</div>${groups}`;
  }).join("");
  document.querySelector("#subtask-count").textContent = `${completedTasks} / ${totalTasks}`;
  document.querySelector("#detail-output").textContent = week.output;
  document.querySelector("#complete-week").textContent = weekDone(week) ? "Označit jako nedokončené" : "Označit týden jako hotový";
  document.querySelector("#period-title").textContent = `${formatDate(week.from, { month: "long", year: "numeric" })} · týden ${week.index}`;
}

function render() {
  renderSummary();
  renderMiniCalendar();
  renderWeeks();
  renderDetail();
}

function setWeekSubjects(week, done) {
  if (week.final) setSubjectState(week, "program", done);
  else ["program", "network"].forEach(subject => setSubjectState(week, subject, done));
}

function selectWeek(index, scroll = false) {
  selectedWeek = Math.max(1, Math.min(26, index));
  render();
  if (scroll) document.querySelector(`#week-${selectedWeek}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.addEventListener("click", event => {
  const groupButton = event.target.closest("[data-complete-group]");
  if (groupButton) {
    event.preventDefault();
    event.stopPropagation();
    const week = weeks[selectedWeek - 1];
    const subject = groupButton.dataset.completeGroup;
    const sectionIndex = Number(groupButton.dataset.section);
    const section = sectionsFor(week, subject)[sectionIndex];
    const keys = section.questions.map((_question, questionIndex) => taskKey(week, subject, sectionIndex, questionIndex));
    const done = !keys.every(key => state.details?.[key]);
    state.details ||= {};
    keys.forEach(key => { state.details[key] = done; });
    syncSubjectFromTasks(week, subject);
    saveState();
    return;
  }
  const row = event.target.closest("[data-select-week]");
  if (row) selectWeek(Number(row.dataset.selectWeek));
  const day = event.target.closest("[data-date]");
  if (day) {
    const date = new Date(day.dataset.date);
    const index = Math.floor((date - start) / (7 * dayMs)) + 1;
    if (index >= 1 && index <= 26) selectWeek(index, true);
  }
});

document.addEventListener("change", event => {
  if (event.target.matches("[data-subject]")) {
    const week = weeks[Number(event.target.dataset.week) - 1];
    const subject = week.final ? "program" : event.target.dataset.subject;
    setSubjectState(week, subject, event.target.checked);
    saveState();
  }
  if (event.target.matches("[data-topic-task]")) {
    state.details ||= {};
    state.details[event.target.dataset.topicTask] = event.target.checked;
    syncSubjectFromTasks(weeks[selectedWeek - 1], event.target.dataset.taskSubject);
    saveState();
  }
});

document.addEventListener("toggle", event => {
  if (!event.target.matches(".subtask-group")) return;
  if (event.target.open) openGroups.add(event.target.dataset.groupId);
  else openGroups.delete(event.target.dataset.groupId);
}, true);

document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
  renderWeeks();
}));

document.querySelector("#search-input").addEventListener("input", event => {
  searchTerm = event.target.value.trim().toLocaleLowerCase("cs");
  renderWeeks();
});

document.querySelector("#today-button").addEventListener("click", () => selectWeek(getCurrentWeek().index, true));
document.querySelector("#previous-week").addEventListener("click", () => selectWeek(selectedWeek - 1, true));
document.querySelector("#next-week").addEventListener("click", () => selectWeek(selectedWeek + 1, true));
document.querySelector("#complete-week").addEventListener("click", () => {
  const week = weeks[selectedWeek - 1];
  setWeekSubjects(week, !weekDone(week));
  saveState();
});

const dialog = document.querySelector("#reset-dialog");
document.querySelector(".reset-button").addEventListener("click", () => dialog.showModal());
document.querySelector("#confirm-reset").addEventListener("click", () => {
  state = { subjects: {}, details: {} };
  localStorage.removeItem(storageKey);
  window.desktop?.syncProgress(state);
  render();
});

const savedTheme = localStorage.getItem(themeKey);
if (savedTheme === "dark") document.documentElement.classList.add("dark");
document.querySelector(".theme-toggle").addEventListener("click", () => {
  const dark = document.documentElement.classList.toggle("dark");
  localStorage.setItem(themeKey, dark ? "dark" : "light");
});

if (window.desktop?.isDesktop) {
  const reminder = document.querySelector("#test-reminder");
  reminder.hidden = false;
  reminder.addEventListener("click", async () => {
    const shown = await window.desktop.showTestReminder();
    reminder.textContent = shown ? "✓" : "!";
    setTimeout(() => { reminder.textContent = "♢"; }, 1800);
  });
  window.desktop.syncProgress(state);
}

async function initialize() {
  if (window.desktop?.getTopicDocuments) {
    const documents = await window.desktop.getTopicDocuments();
    topicDocuments = {
      program: parseTopicDocument(documents.program || ""),
      network: parseTopicDocument(documents.network || "")
    };
  }
  render();
  requestAnimationFrame(() => document.querySelector(`#week-${selectedWeek}`)?.scrollIntoView({ block: "center" }));
}

initialize();
