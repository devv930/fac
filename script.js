/* ==========================================================
   FAC202 CBT — Engine
   Replace the QUESTIONS array below with your real FAC202
   questions. Keep the same shape for each item:
   { q: "question text", o: ["A","B","C","D"], a: 1, e: "explanation" }
   "a" is the zero-based index of the correct option in "o".
========================================================== */

const CONFIG = {
  course: "FAC202",
  durationSeconds: 20 * 60,
  storageKey: "fac202_cbt_attempt_v1"
};

/* Sample placeholder bank — SWAP THESE FOR YOUR REAL QUESTIONS */
const QUESTIONS = Array.from({ length: 60 }, (_, n) => ({
  q: `Sample FAC202 Question ${n + 1}: Technology is primarily?`,
  o: ["Art", "Application of science", "Religion", "None"],
  a: 1,
  e: "Technology is the application of science to solve problems."
}));

/* ---------------- state ---------------- */
let current = 0;
let answers = {};   // { qIndex: optionIndex }
let flagged = {};   // { qIndex: true }
let secondsLeft = CONFIG.durationSeconds;
let timerHandle = null;
let submitted = false;
let activeFilter = "all";

/* ---------------- elements ---------------- */
const el = (id) => document.getElementById(id);
const startScreen = el("startScreen");
const testScreen = el("testScreen");
const resultsScreen = el("resultsScreen");

const startBtn = el("startBtn");
const resumeBtn = el("resumeBtn");
const metaCount = el("metaCount");
const metaTime = el("metaTime");

const timerEl = el("timer");
const progressBar = el("progressBar");
const paletteEl = el("palette");
const flagBtn = el("flagBtn");
const submitBtn = el("submitBtn");

const qIndexEl = el("qIndex");
const qStatusEl = el("qStatus");
const qTextEl = el("qText");
const optsEl = el("opts");
const prevBtn = el("prevBtn");
const nextBtn = el("nextBtn");
const clearBtn = el("clearBtn");

const confirmModal = el("confirmModal");
const confirmText = el("confirmText");
const cancelSubmit = el("cancelSubmit");
const confirmSubmit = el("confirmSubmit");

const scoreHeadline = el("scoreHeadline");
const scoreSub = el("scoreSub");
const statCorrect = el("statCorrect");
const statWrong = el("statWrong");
const statSkip = el("statSkip");
const reviewList = el("reviewList");
const retryBtn = el("retryBtn");

/* ---------------- init screen labels ---------------- */
metaCount.textContent = QUESTIONS.length;
metaTime.textContent = formatTime(CONFIG.durationSeconds);

/* ---------------- resume check ---------------- */
(function checkSavedAttempt() {
  const saved = loadState();
  if (saved && !saved.submitted) {
    resumeBtn.hidden = false;
  }
})();

startBtn.addEventListener("click", () => {
  clearState();
  current = 0; answers = {}; flagged = {}; secondsLeft = CONFIG.durationSeconds; submitted = false;
  beginTest();
});

resumeBtn.addEventListener("click", () => {
  const saved = loadState();
  if (!saved) return beginTest();
  current = saved.current || 0;
  answers = saved.answers || {};
  flagged = saved.flagged || {};
  secondsLeft = typeof saved.secondsLeft === "number" ? saved.secondsLeft : CONFIG.durationSeconds;
  beginTest();
});

function beginTest() {
  startScreen.hidden = true;
  testScreen.hidden = false;
  buildPalette();
  renderQuestion();
  startTimer();
}

/* ---------------- timer ---------------- */
function startTimer() {
  clearInterval(timerHandle);
  tick();
  timerHandle = setInterval(tick, 1000);
}

function tick() {
  timerEl.textContent = formatTime(secondsLeft);
  timerEl.classList.toggle("low", secondsLeft <= 60);
  if (secondsLeft <= 0) {
    clearInterval(timerHandle);
    finishTest();
    return;
  }
  secondsLeft--;
  saveState();
}

function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---------------- rendering ---------------- */
function renderQuestion() {
  const q = QUESTIONS[current];
  qIndexEl.textContent = `Question ${current + 1} of ${QUESTIONS.length}`;
  qStatusEl.textContent = flagged[current] ? "Flagged" : "";
  qTextEl.textContent = q.q;

  optsEl.innerHTML = "";
  q.o.forEach((text, n) => {
    const selected = answers[current] === n;
    const row = document.createElement("label");
    row.className = "opt" + (selected ? " selected" : "");
    row.innerHTML = `
      <input type="radio" name="opt" ${selected ? "checked" : ""}>
      <span class="opt-letter">${String.fromCharCode(65 + n)}</span>
      <span class="opt-text"></span>
    `;
    row.querySelector(".opt-text").textContent = text;
    row.addEventListener("click", () => selectOption(n));
    optsEl.appendChild(row);
  });

  flagBtn.classList.toggle("active", !!flagged[current]);
  flagBtn.textContent = flagged[current] ? "Unflag this question" : "Flag this question";
  prevBtn.disabled = current === 0;
  nextBtn.textContent = current === QUESTIONS.length - 1 ? "Review & submit" : "Next →";

  updatePalette();
  updateProgress();
}

function selectOption(n) {
  answers[current] = n;
  renderQuestion();
  saveState();
}

function updateProgress() {
  const answeredCount = Object.keys(answers).length;
  progressBar.style.width = `${(answeredCount / QUESTIONS.length) * 100}%`;
}

/* ---------------- palette ---------------- */
function buildPalette() {
  paletteEl.innerHTML = "";
  QUESTIONS.forEach((_, n) => {
    const btn = document.createElement("div");
    btn.className = "pnum";
    btn.textContent = n + 1;
    btn.addEventListener("click", () => {
      current = n;
      renderQuestion();
    });
    paletteEl.appendChild(btn);
  });
  updatePalette();
}

function updatePalette() {
  Array.from(paletteEl.children).forEach((btn, n) => {
    btn.classList.toggle("current", n === current);
    btn.classList.toggle("answered", answers[n] !== undefined);
    btn.classList.toggle("flagged", !!flagged[n]);
  });
}

/* ---------------- nav buttons ---------------- */
prevBtn.addEventListener("click", () => {
  if (current > 0) { current--; renderQuestion(); }
});

nextBtn.addEventListener("click", () => {
  if (current < QUESTIONS.length - 1) { current++; renderQuestion(); }
  else openConfirm();
});

clearBtn.addEventListener("click", () => {
  delete answers[current];
  renderQuestion();
  saveState();
});

flagBtn.addEventListener("click", () => {
  if (flagged[current]) delete flagged[current];
  else flagged[current] = true;
  renderQuestion();
  saveState();
});

/* keyboard shortcuts: arrows to move, 1-4 / A-D to answer */
document.addEventListener("keydown", (e) => {
  if (testScreen.hidden) return;
  if (e.key === "ArrowRight") nextBtn.click();
  if (e.key === "ArrowLeft") prevBtn.click();
  const num = parseInt(e.key, 10);
  if (!isNaN(num) && num >= 1 && num <= QUESTIONS[current].o.length) selectOption(num - 1);
  const letter = e.key.toUpperCase().charCodeAt(0) - 65;
  if (/^[A-D]$/i.test(e.key) && letter < QUESTIONS[current].o.length) selectOption(letter);
});

/* ---------------- submit flow ---------------- */
submitBtn.addEventListener("click", openConfirm);

function openConfirm() {
  const unanswered = QUESTIONS.length - Object.keys(answers).length;
  confirmText.textContent = unanswered > 0
    ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway?`
    : "You've answered every question. Ready to submit?";
  confirmModal.hidden = false;
}

cancelSubmit.addEventListener("click", () => confirmModal.hidden = true);
confirmSubmit.addEventListener("click", () => {
  confirmModal.hidden = true;
  finishTest();
});

function finishTest() {
  submitted = true;
  clearInterval(timerHandle);
  saveState();
  renderResults();
  testScreen.hidden = true;
  resultsScreen.hidden = false;
}

/* ---------------- results ---------------- */
function renderResults() {
  let correct = 0, wrong = 0, skip = 0;
  QUESTIONS.forEach((q, n) => {
    if (answers[n] === undefined) skip++;
    else if (answers[n] === q.a) correct++;
    else wrong++;
  });

  scoreHeadline.textContent = `${correct} / ${QUESTIONS.length}`;
  const pct = Math.round((correct / QUESTIONS.length) * 100);
  scoreSub.textContent = `You scored ${pct}%.`;
  statCorrect.textContent = correct;
  statWrong.textContent = wrong;
  statSkip.textContent = skip;

  renderReviewList();
}

function renderReviewList() {
  reviewList.innerHTML = "";
  QUESTIONS.forEach((q, n) => {
    const userAns = answers[n];
    const state = userAns === undefined ? "skip" : (userAns === q.a ? "correct" : "wrong");

    if (activeFilter === "wrong" && state !== "wrong" && state !== "skip") return;
    if (activeFilter === "flagged" && !flagged[n]) return;

    const item = document.createElement("div");
    item.className = `review-item ${state}`;
    item.innerHTML = `
      <div class="review-q">${n + 1}. ${escapeHtml(q.q)}</div>
      <div class="review-row">Your answer: <b>${userAns !== undefined ? escapeHtml(q.o[userAns]) : "— not answered —"}</b></div>
      <div class="review-row">Correct answer: <b>${escapeHtml(q.o[q.a])}</b></div>
      <div class="review-explain">${escapeHtml(q.e)}</div>
    `;
    reviewList.appendChild(item);
  });

  if (!reviewList.children.length) {
    reviewList.innerHTML = `<div class="review-item"><div class="review-q">Nothing to show for this filter.</div></div>`;
  }
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    activeFilter = chip.dataset.filter;
    renderReviewList();
  });
});

retryBtn.addEventListener("click", () => {
  clearState();
  current = 0; answers = {}; flagged = {}; secondsLeft = CONFIG.durationSeconds; submitted = false; activeFilter = "all";
  resultsScreen.hidden = true;
  startScreen.hidden = false;
  resumeBtn.hidden = true;
});

/* ---------------- persistence ---------------- */
function saveState() {
  const state = { current, answers, flagged, secondsLeft, submitted };
  try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); } catch (e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearState() {
  try { localStorage.removeItem(CONFIG.storageKey); } catch (e) {}
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
