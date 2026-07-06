const characterSets = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>/?~",
};

const ambiguousCharacters = new Set("O0Il1|`'\"");

const state = {
  history: [],
  password: "",
};

const elements = {
  motionField: document.querySelector("#motionField"),
  passwordOutput: document.querySelector("#passwordOutput"),
  copyButton: document.querySelector("#copyButton"),
  generateButton: document.querySelector("#generateButton"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  resetButton: document.querySelector("#resetButton"),
  lengthRange: document.querySelector("#lengthRange"),
  lengthNumber: document.querySelector("#lengthNumber"),
  lengthValue: document.querySelector("#lengthValue"),
  lengthStat: document.querySelector("#lengthStat"),
  poolStat: document.querySelector("#poolStat"),
  typeStat: document.querySelector("#typeStat"),
  lowercaseToggle: document.querySelector("#lowercaseToggle"),
  uppercaseToggle: document.querySelector("#uppercaseToggle"),
  numberToggle: document.querySelector("#numberToggle"),
  symbolToggle: document.querySelector("#symbolToggle"),
  ambiguousToggle: document.querySelector("#ambiguousToggle"),
  meterFill: document.querySelector("#meterFill"),
  strengthLabel: document.querySelector("#strengthLabel"),
  entropyLabel: document.querySelector("#entropyLabel"),
  strengthBadge: document.querySelector("#strengthBadge"),
  recentList: document.querySelector("#recentList"),
  toast: document.querySelector("#toast"),
};

const toggles = [
  ["lowercase", elements.lowercaseToggle],
  ["uppercase", elements.uppercaseToggle],
  ["numbers", elements.numberToggle],
  ["symbols", elements.symbolToggle],
];

let toastTimer;

function cryptoIndex(max) {
  const safeMax = Math.max(1, Math.floor(max));
  const range = 0x100000000;
  const limit = range - (range % safeMax);
  const value = new Uint32Array(1);

  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);

  return value[0] % safeMax;
}

function randomFrom(text) {
  return text[cryptoIndex(text.length)];
}

function shuffleCharacters(characters) {
  const copy = [...characters];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = cryptoIndex(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy.join("");
}

function sanitizeSet(text) {
  if (!elements.ambiguousToggle.checked) {
    return text;
  }

  return [...text].filter((character) => !ambiguousCharacters.has(character)).join("");
}

function selectedSets() {
  return toggles
    .filter(([, element]) => element.checked)
    .map(([name]) => sanitizeSet(characterSets[name]))
    .filter(Boolean);
}

function currentLength() {
  const parsed = Number.parseInt(elements.lengthNumber.value, 10);
  return Math.min(64, Math.max(8, Number.isFinite(parsed) ? parsed : 24));
}

function syncLength(value) {
  const length = Math.min(64, Math.max(8, Number.parseInt(value, 10) || 24));
  elements.lengthRange.value = String(length);
  elements.lengthNumber.value = String(length);
  elements.lengthValue.textContent = String(length);
}

function buildPassword() {
  let sets = selectedSets();

  if (sets.length === 0) {
    elements.lowercaseToggle.checked = true;
    sets = selectedSets();
    showToast("LOWERCASE ENABLED");
  }

  const length = currentLength();
  const pool = sets.join("");
  const requiredCharacters = sets.map((set) => randomFrom(set));
  const restLength = Math.max(0, length - requiredCharacters.length);
  const rest = Array.from({ length: restLength }, () => randomFrom(pool));

  return {
    password: shuffleCharacters([...requiredCharacters, ...rest]),
    poolSize: new Set(pool).size,
    typeCount: sets.length,
    length,
  };
}

function scorePassword(length, poolSize) {
  const entropy = Math.round(length * Math.log2(Math.max(poolSize, 1)));
  const score = Math.min(1, entropy / 128);

  if (entropy < 45) {
    return {
      entropy,
      score,
      label: "Weak",
      badge: "REBUILD",
      color: "var(--danger)",
    };
  }

  if (entropy < 70) {
    return {
      entropy,
      score,
      label: "Solid",
      badge: "SOLID",
      color: "var(--yellow)",
    };
  }

  if (entropy < 100) {
    return {
      entropy,
      score,
      label: "Strong",
      badge: "STRONG",
      color: "var(--cyan)",
    };
  }

  return {
    entropy,
    score,
    label: "Brutal",
    badge: "BRUTAL",
    color: "var(--lime)",
  };
}

function renderStats(details) {
  const strength = scorePassword(details.length, details.poolSize);

  elements.passwordOutput.value = state.password;
  elements.passwordOutput.textContent = state.password;
  elements.lengthValue.textContent = String(details.length);
  elements.lengthStat.textContent = String(details.length);
  elements.poolStat.textContent = String(details.poolSize);
  elements.typeStat.textContent = String(details.typeCount);
  elements.strengthLabel.textContent = strength.label;
  elements.entropyLabel.textContent = `${strength.entropy} bits`;
  elements.strengthBadge.textContent = strength.badge;
  elements.meterFill.style.setProperty("--score", String(strength.score));
  elements.meterFill.style.setProperty("--meter-color", strength.color);
}

function renderHistory() {
  elements.recentList.replaceChildren();

  if (state.history.length === 0) {
    const empty = document.createElement("li");
    empty.className = "recent-value";
    empty.textContent = "No session passwords";
    elements.recentList.append(empty);
    return;
  }

  state.history.slice(0, 5).forEach((password) => {
    const item = document.createElement("li");
    item.className = "recent-item";

    const value = document.createElement("span");
    value.className = "recent-value";
    value.textContent = password;

    const button = document.createElement("button");
    button.className = "recent-copy";
    button.type = "button";
    button.textContent = "COPY";
    button.addEventListener("click", () => copyPassword(password));

    item.append(value, button);
    elements.recentList.append(item);
  });
}

function generatePassword() {
  const details = buildPassword();
  state.password = details.password;
  state.history = [details.password, ...state.history.filter((item) => item !== details.password)].slice(0, 5);
  renderStats(details);
  renderHistory();
}

async function copyPassword(password = state.password) {
  if (!password) {
    return;
  }

  try {
    await navigator.clipboard.writeText(password);
    showToast("COPIED");
  } catch {
    const helper = document.createElement("textarea");
    helper.value = password;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    showToast("COPIED");
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 1500);
}

function resetControls() {
  syncLength(24);
  elements.lowercaseToggle.checked = true;
  elements.uppercaseToggle.checked = true;
  elements.numberToggle.checked = true;
  elements.symbolToggle.checked = true;
  elements.ambiguousToggle.checked = true;
  generatePassword();
  showToast("RESET");
}

function bindControls() {
  elements.lengthRange.addEventListener("input", (event) => {
    syncLength(event.target.value);
    generatePassword();
  });

  elements.lengthNumber.addEventListener("input", (event) => {
    syncLength(event.target.value);
    generatePassword();
  });

  [...toggles.map(([, element]) => element), elements.ambiguousToggle].forEach((toggle) => {
    toggle.addEventListener("change", generatePassword);
  });

  elements.generateButton.addEventListener("click", generatePassword);
  elements.copyButton.addEventListener("click", () => copyPassword());
  elements.resetButton.addEventListener("click", resetControls);
  elements.clearHistoryButton.addEventListener("click", () => {
    state.history = [];
    renderHistory();
    showToast("CLEARED");
  });
}

function setupMotionField() {
  const canvas = elements.motionField;
  const context = canvas.getContext("2d");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const glyphs = "#$%&*01AZaz";
  let width = 0;
  let height = 0;
  let columns = [];

  function resize() {
    const pixelRatio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const count = Math.max(18, Math.floor(width / 58));
    columns = Array.from({ length: count }, (_, index) => ({
      x: index * 58 + cryptoIndex(22),
      y: cryptoIndex(Math.max(80, height)),
      speed: 0.35 + cryptoIndex(11) / 20,
      color: index % 4 === 0 ? "#37f0ff" : index % 5 === 0 ? "#ff4fd8" : "#050505",
    }));
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    context.font = "900 16px Consolas, monospace";
    context.textBaseline = "top";

    columns.forEach((column, index) => {
      context.fillStyle = column.color;
      context.globalAlpha = index % 3 === 0 ? 0.44 : 0.28;
      context.fillText(glyphs[(index + Math.floor(column.y / 32)) % glyphs.length], column.x, column.y);
      context.fillRect(column.x - 3, column.y + 22, 28, 5);
      column.y += column.speed;

      if (column.y > height + 40) {
        column.y = -40;
        column.x = cryptoIndex(Math.max(80, width));
      }
    });

    context.globalAlpha = 1;

    if (!prefersReducedMotion.matches) {
      window.requestAnimationFrame(draw);
    }
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
}

bindControls();
syncLength(24);
generatePassword();
setupMotionField();
