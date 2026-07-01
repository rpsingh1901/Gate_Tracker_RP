import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from
  "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAclJH1MsaImJClPURkvLlnhng5h-ucDIY",
  authDomain: "gate-tracker-rp.firebaseapp.com",
  projectId: "gate-tracker-rp",
  storageBucket: "gate-tracker-rp.firebasestorage.app",
  messagingSenderId: "707741952732",
  appId: "1:707741952732:web:cb12433c81ce022f446219"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
let currentUser = null;
const COLS = ['clg', 'me', 'qp', 'pyq'];
const COL_LABELS = ['cmplt(~clg)', 'cmplt(~me)', 'QuesPrac', 'PYQs'];
const COL_CLASSES = ['checked-clg', 'checked-me', 'checked-qp', 'checked-pyq'];
const COL_ICONS = ['✓', '✓', '✓', '✓'];

const SECTIONS = [
  {
    id: 's1', num: 'SEC 01', name: 'Engineering Mathematics', topics: [
      'Propositional and first order logic',
      'Sets, relations, functions, partial orders and lattices',
      'Monoids, Groups',
      'Graphs: connectivity, matching, colouring',
      'Combinatorics: counting, recurrence relations, generating functions',
      'Matrices, determinants, system of linear equations',
      'Eigenvalues and eigenvectors, LU decomposition',
      'Limits, continuity and differentiability',
      'Maxima and minima, Mean value theorem, Integration',
      'Random variables & distributions (Uniform, Normal, Exponential, Poisson, Binomial)',
      'Mean, median, mode and standard deviation',
      'Conditional probability and Bayes theorem',
    ]
  },
  {
    id: 's2', num: 'SEC 02', name: 'Digital Logic', topics: [
      'Boolean algebra',
      'Combinational and sequential circuits',
      'Minimization',
      'Number representations and computer arithmetic (fixed and floating point)',
    ]
  },
  {
    id: 's3', num: 'SEC 03', name: 'Computer Organization and Architecture', topics: [
      'Machine instructions and addressing modes',
      'ALU, data-path and control unit',
      'Instruction pipelining, pipeline hazards',
      'Memory hierarchy: cache, main memory and secondary storage',
      'I/O interface: interrupt and DMA mode',
    ]
  },
  {
    id: 's4', num: 'SEC 04', name: 'Programming and Data Structures', topics: [
      'Programming in C',
      'Recursion',
      'Arrays, stacks, queues, linked lists',
      'Trees, binary search trees, binary heaps',
      'Graphs',
    ]
  },
  {
    id: 's5', num: 'SEC 05', name: 'Algorithms', topics: [
      'Searching, sorting, hashing',
      'Asymptotic worst case time and space complexity',
      'Greedy algorithm design',
      'Dynamic programming',
      'Divide-and-conquer',
      'Graph traversals',
      'Minimum spanning trees',
      'Shortest paths',
    ]
  },
  {
    id: 's6', num: 'SEC 06', name: 'Theory of Computation', topics: [
      'Regular expressions and finite automata',
      'Context-free grammars and push-down automata',
      'Regular and context-free languages, pumping lemma',
      'Turing machines and undecidability',
    ]
  },
  {
    id: 's7', num: 'SEC 07', name: 'Compiler Design', topics: [
      'Lexical analysis',
      'Parsing',
      'Syntax-directed translation',
      'Runtime environments',
      'Intermediate code generation',
      'Local optimization',
      'Data flow analyses: constant propagation',
      'Liveness analysis',
      'Common subexpression elimination',
    ]
  },
  {
    id: 's8', num: 'SEC 08', name: 'Operating System', topics: [
      'System calls, processes, threads',
      'Inter-process communication',
      'Concurrency and synchronization',
      'Deadlock',
      'CPU and I/O scheduling',
      'Memory management and virtual memory',
      'File systems',
    ]
  },
  {
    id: 's9', num: 'SEC 09', name: 'Databases', topics: [
      'ER-model',
      'Relational algebra and tuple calculus',
      'SQL',
      'Integrity constraints, normal forms',
      'File organization, indexing (B and B+ trees)',
      'Transactions and concurrency control',
    ]
  },
  {
    id: 's10', num: 'SEC 10', name: 'Computer Networks', topics: [
      'OSI and TCP/IP protocol stacks',
      'Packet, circuit and virtual circuit switching',
      'Data link layer: framing, error detection, MAC, Ethernet bridging',
      'Routing protocols: shortest path, flooding, distance vector, link state',
      'IP addressing, IPv4, CIDR notation',
      'IP support protocols: ARP, DHCP, ICMP, NAT',
      'Transport layer: flow control, congestion control, UDP, TCP, sockets',
      'Application layer protocols: DNS, SMTP, HTTP, FTP, Email',
    ]
  },
];

// ── State ──
let state = {};
let currentStreak = 0;
let bestStreak = 0;
let lastStudyDate = null;

async function loadState() {

  try {

    if (!currentUser) {
      state = {};
      return;
    }

    const snap = await getDoc(
      doc(
        db,
        "users",
        currentUser.uid,
        "progress",
        "gate"
      )
    );

    if (snap.exists()) {
      state = snap.data();
    } else {
      state = {};
    }

  } catch (e) {

    console.error(e);
    state = {};

  }
}

async function saveState() {

  try {

    if (!currentUser) return;

    await setDoc(
      doc(
        db,
        "users",
        currentUser.uid,
        "progress",
        "gate"
      ),
      state
    );

    showToast();

  } catch (e) {

    console.error(e);

  }
}

function getKey(sectionId, topicIdx, col) {
  return `${sectionId}_t${topicIdx}_${col}`;
}

function isChecked(sectionId, topicIdx, col) {
  return !!state[getKey(sectionId, topicIdx, col)];
}

// ── Toast ──
let toastTimer;
function showToast() {
  const t = document.getElementById('toast');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ── Render ──
function render() {
  const container = document.getElementById('sections-container');
  container.innerHTML = '';

  SECTIONS.forEach((sec, si) => {
    const block = document.createElement('div');
    block.className = 'section-block';
    block.id = 'block-' + sec.id;

    block.innerHTML = `
      <div class="section-header" onclick="toggleSection('${sec.id}')">
        <div class="section-title-row">
          <span class="section-num">${sec.num}</span>
          <span class="section-name">${sec.name}</span>
        </div>
        <div class="section-meta">
          <span class="section-progress" id="sprog-${sec.id}"></span>
          <span class="chevron">▾</span>
        </div>
      </div>
      <div class="section-body">
        <table class="topic-table">
          <thead>
            <tr class="table-header-row">
              <th>Topic</th>
              <th class="col-clg">cmplt(~clg)</th>
              <th class="col-me">cmplt(~me)</th>
              <th class="col-qp">QuesPrac</th>
              <th class="col-pyq">PYQs</th>
            </tr>
          </thead>
          <tbody id="tbody-${sec.id}"></tbody>
        </table>
      </div>
    `;
    container.appendChild(block);

    const tbody = document.getElementById('tbody-' + sec.id);
    sec.topics.forEach((topic, ti) => {
      const row = document.createElement('tr');
      row.className = 'topic-row';
      row.id = `row-${sec.id}-${ti}`;

      let cells = `<td><div class="topic-name-cell"><span class="topic-idx">${ti + 1}</span>${topic}</div></td>`;
      COLS.forEach((col, ci) => {
        const checked = isChecked(sec.id, ti, col);
        cells += `<td><button class="check-btn ${checked ? COL_CLASSES[ci] : ''}"
          id="btn-${sec.id}-${ti}-${col}"
          onclick="toggle('${sec.id}',${ti},'${col}',${ci},this)"
          title="${checked ? 'Mark as pending' : 'Mark as done'}"
          >${checked ? COL_ICONS[ci] : '○'}</button></td>`;
      });
      row.innerHTML = cells;
      tbody.appendChild(row);
      updateRowStyle(sec.id, ti);
    });

    updateSectionProgress(sec.id);
  });

  updateGlobalProgress();
}

function toggle(secId, topicIdx, col, colIdx, btn) {
  const key = getKey(secId, topicIdx, col);
  const nowChecked = !state[key];
  state[key] = nowChecked;

  btn.classList.toggle(COL_CLASSES[colIdx], nowChecked);
  btn.textContent = nowChecked ? COL_ICONS[colIdx] : '○';
  btn.title = nowChecked ? 'Mark as pending' : 'Mark as done';

  btn.classList.remove('pop');
  void btn.offsetWidth;
  btn.classList.add('pop');

  updateRowStyle(secId, topicIdx);
  updateSectionProgress(secId);
  updateGlobalProgress();
  updateStreak();
  saveState();
}

function updateRowStyle(secId, topicIdx) {
  const row = document.getElementById(`row-${secId}-${topicIdx}`);
  if (!row) return;
  const allDone = COLS.every(col => isChecked(secId, topicIdx, col));
  row.classList.toggle('all-done', allDone);
}

function updateSectionProgress(secId) {
  const sec = SECTIONS.find(s => s.id === secId);
  const total = sec.topics.length * COLS.length;
  let done = 0;
  sec.topics.forEach((_, ti) => {
    COLS.forEach(col => { if (isChecked(secId, ti, col)) done++; });
  });
  const pct = Math.round((done / total) * 100);
  const el = document.getElementById('sprog-' + secId);
  if (el) el.textContent = `${done}/${total} · ${pct}%`;
}

function updateGlobalProgress() {
  const totalTopics = SECTIONS.reduce((s, sec) => s + sec.topics.length, 0);

  COLS.forEach((col, ci) => {
    let done = 0;
    SECTIONS.forEach(sec => {
      sec.topics.forEach((_, ti) => { if (isChecked(sec.id, ti, col)) done++; });
    });
    const pct = Math.round((done / totalTopics) * 100);
    document.getElementById('val-' + col).textContent = pct + '%';
    document.getElementById('bar-' + col).style.width = pct + '%';
  });
  // Calculate overall completion
  let totalDone = 0;

  SECTIONS.forEach(sec => {
    sec.topics.forEach((_, ti) => {
      COLS.forEach(col => {
        if (isChecked(sec.id, ti, col))
          totalDone++;
      });
    });
  });

  const overallPercent = Math.round(
    (totalDone / (totalTopics * COLS.length)) * 100
  );

  updateLevel(overallPercent);
}

function updateLevel(percent) {

  let level = "";
  let xp = percent * 10;

  if (percent < 10)
    level = "🌱 Beginner";

  else if (percent < 25)
    level = "📘 Learner";

  else if (percent < 40)
    level = "🎯 GATE Aspirant";

  else if (percent < 60)
    level = "⚡ Problem Solver";

  else if (percent < 80)
    level = "🔥 GATE Warrior";

  else if (percent < 100)
    level = "🚀 AIR Hunter";

  else
    level = "👑 GATE Legend";

  document.getElementById(
    "level-name"
  ).innerText = level;

  document.getElementById(
    "xp-text"
  ).innerText = xp + " XP";

  document.getElementById(
    "xp-fill"
  ).style.height = percent + "%";


  // BADGES SECTION
  if (percent >= 1)
    unlockBadge("badge1", "First Step");

  if (percent >= 25)
    unlockBadge("badge2", "25% Complete");

  if (percent >= 50)
    unlockBadge("badge3", "Half Syllabus");

  if (percent >= 80)
    unlockBadge("badge4", "AIR Hunter");

  if (percent >= 100)
    unlockBadge("badge5", "GATE Legend");
}

function unlockBadge(id, text) {

  const badge =
    document.getElementById(id);

  if (
    badge.classList.contains("locked")
  ) {

    badge.classList.remove("locked");

    badge.classList.add("unlocked");

    badge.innerHTML =
      badge.innerHTML.replace(
        "🔒",
        "✅"
      );
  }
}

function toggleSection(secId) {
  const block = document.getElementById('block-' + secId);
  block.classList.toggle('open');
}

async function resetAll() {

  if (
    !confirm(
      "Reset all progress? This cannot be undone."
    )
  ) return;

  state = {};

  try {

    if (currentUser) {

      await setDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "progress",
          "gate"
        ),
        {}
      );

    }

    render();

    alert(
      "All progress has been reset."
    );

  }
  catch (e) {

    console.error(e);

    alert(
      "Failed to reset progress."
    );

  }
}
// Make functions visible to HTML onclick handlers
window.toggle = toggle;
window.toggleSection = toggleSection;
window.resetAll = resetAll;
// ── Init ──

onAuthStateChanged(auth, async (user) => {

  currentUser = user;

  if (user) {

    await loadState();

    render();

    document.getElementById(
      "loginCard"
    ).style.display = "none";

    document.getElementById(
      "userPanel"
    ).style.display = "block";

    document.getElementById(
      "userEmail"
    ).textContent =
      user.email;

  } else {

    state = {};

    render();

    document.getElementById(
      "loginCard"
    ).style.display = "block";

    document.getElementById(
      "userPanel"
    ).style.display = "none";

  }
});

async function loginWithGoogle() {

  try {

    const result = await signInWithPopup(
      auth,
      provider
    );

    currentUser = result.user;

    await loadState();

    render();

    document.getElementById(
      "loginCard"
    ).style.display = "none";

    alert(
      "Logged in as: " +
      currentUser.email
    );

  }
  catch (err) {

    console.error(err);
    alert(err.message);

  }
}

document
  .getElementById("googleLoginBtn")
  .addEventListener(
    "click",
    loginWithGoogle
  );
async function logoutUser() {



  try {

    await signOut(auth);

    alert("Logged out");

  }
  catch (err) {

    console.error(err);
    alert(err.message);

  }
}

window.logoutUser = logoutUser;

function updateCountdown() {

  // Change this if official date changes
  const gateDate =
    new Date(
      "2027-02-06T09:30:00"
    );

  const now =
    new Date();

  const diff =
    gateDate - now;

  const days =
    Math.floor(
      diff /
      (1000 * 60 * 60 * 24)
    );

  const hours =
    Math.floor(
      (diff %
        (1000 * 60 * 60 * 24)) /
      (1000 * 60 * 60)
    );

  const minutes =
    Math.floor(
      (diff %
        (1000 * 60 * 60)) /
      (1000 * 60)
    );

  const seconds =
    Math.floor(
      (diff %
        (1000 * 60)) /
      1000
    );

  document
    .getElementById(
      "countdown"
    ).textContent =
    `${days} Days • ${hours} Hrs • ${minutes} Min • ${seconds} Sec`;
}

function updateStreak() {

    const today =
        new Date().toDateString();

    if (lastStudyDate === today)
        return;

    const yesterday =
        new Date();

    yesterday.setDate(
        yesterday.getDate() - 1
    );

    if (
        lastStudyDate ===
        yesterday.toDateString()
    ) {

        currentStreak++;

    } else {

        currentStreak = 1;
    }

    lastStudyDate = today;

    if (
        currentStreak > bestStreak
    ) {
        bestStreak =
            currentStreak;
    }

    document.getElementById(
        "current-streak"
    ).innerText =
        "Day " + currentStreak;

    document.getElementById(
        "best-streak"
    ).innerText =
        bestStreak;

    document.getElementById(
        "streak-status"
    ).innerText =
        "🔥 Keep going!";
}

updateCountdown();

setInterval(
  updateCountdown,
  1000
);