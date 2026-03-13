const API = "/api/students";

const studentForm = document.getElementById("studentForm");
const fullNameEl = document.getElementById("fullName");
const graduationModeEl = document.getElementById("graduationMode");
const graduationDateEl = document.getElementById("graduationDate");
const avatarEl = document.getElementById("avatar");
const clearFormBtn = document.getElementById("clearForm");
const formStatus = document.getElementById("formStatus");

const studentSelect = document.getElementById("studentSelect");
const studentList = document.getElementById("studentList");
const downloadBtn = document.getElementById("downloadBtn");
const refreshBtn = document.getElementById("refreshBtn");
const canvas = document.getElementById("posterCanvas");
const ctx = canvas.getContext("2d");

let students = [];
let selectedStudent = null;

const templateColors = {
  paper: "#e8eaec",
  pale: "#dce3e8",
  navy: "#042d63",
  cyan: "#40bfcc",
  textNavy: "#0a2f66",
  textDark: "#121417",
};

const templateAssets = {
  background: "/assets/background.png",
  leftLogo: "/assets/logo-left.png",
  rightLogo: "/assets/logo-right.png",
  topIcon: "/assets/top-icon.png",
};

let cachedBackground = null;
let backgroundLoadFailed = false;

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function setStatus(message, type = "ok") {
  formStatus.textContent = message;
  formStatus.className = `status ${type}`;
}
async function ensureFontsLoaded() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await document.fonts.load('700 32px "Ananda Black Personal Use"');
  } catch {
    // Ignore font load errors and fall back to default fonts.
  }
}
async function fetchStudents() {
  const res = await fetch(API);
  if (!res.ok) throw new Error("No se pudo cargar estudiantes");
  return res.json();
}

function fillSelect() {
  studentSelect.innerHTML = '<option value="">Seleccione...</option>';
  students.forEach((s) => {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.full_name;
    studentSelect.appendChild(option);
  });
}

function fillList() {
  if (!students.length) {
    studentList.innerHTML = "<p>No hay estudiantes registrados.</p>";
    return;
  }

  studentList.innerHTML = "";
  students.forEach((s) => {
    const card = document.createElement("div");
    card.className = "item";
    card.innerHTML = `
      <h3>${escapeHtml(s.full_name)}</h3>
      <p><strong>Modalidad:</strong> ${escapeHtml(s.graduation_mode)}</p>
      <p><strong>Fecha:</strong> ${formatDate(s.graduation_date)}</p>
      <div class="mini-actions">
        <button class="secondary" data-action="select" data-id="${s.id}">Seleccionar</button>
        <button class="danger" data-action="delete" data-id="${s.id}">Eliminar</button>
      </div>
    `;
    studentList.appendChild(card);
  });
}

function escapeHtml(text = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function drawTemplateBackground(w, h) {
  if (!cachedBackground && !backgroundLoadFailed) {
    try {
      cachedBackground = await loadImage(templateAssets.background);
    } catch {
      backgroundLoadFailed = true;
    }
  }

  if (cachedBackground) {
    ctx.drawImage(cachedBackground, 0, 0, w, h);
    return true;
  }

  ctx.fillStyle = templateColors.paper;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = templateColors.pale;
  ctx.save();
  ctx.translate(-140, 120);
  ctx.rotate(-Math.PI / 4.2);
  ctx.fillRect(0, 0, 420, h * 1.8);
  ctx.restore();

  ctx.save();
  ctx.translate(w + 130, -120);
  ctx.rotate(Math.PI / 4.2);
  ctx.fillRect(0, 0, 320, h * 1.8);
  ctx.restore();

  ctx.fillStyle = templateColors.navy;
  ctx.beginPath();
  ctx.moveTo(0, 330);
  ctx.lineTo(310, 600);
  ctx.lineTo(0, 870);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = templateColors.cyan;
  ctx.beginPath();
  ctx.moveTo(0, 410);
  ctx.lineTo(250, 610);
  ctx.lineTo(0, 800);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = templateColors.navy;
  ctx.beginPath();
  ctx.moveTo(w, 760);
  ctx.lineTo(w - 230, 980);
  ctx.lineTo(w, 1210);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = templateColors.cyan;
  ctx.fillRect(45, 1290, w - 90, 10);
  ctx.fillRect(170, 1615, w - 340, 8);

  ctx.strokeStyle = templateColors.cyan;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(20, 90);
  ctx.lineTo(120, 0);
  ctx.moveTo(w - 180, 495);
  ctx.lineTo(w - 20, 340);
  ctx.moveTo(w - 130, h - 120);
  ctx.lineTo(w - 20, h - 230);
  ctx.moveTo(85, h - 190);
  ctx.lineTo(220, h - 320);
  ctx.stroke();

  return false;
}

function drawDiamondPath(cx, cy, size) {
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - half);
  ctx.lineTo(cx + half, cy);
  ctx.lineTo(cx, cy + half);
  ctx.lineTo(cx - half, cy);
  ctx.closePath();
}

function drawDiamondFrame(cx, cy, size) {
  ctx.fillStyle = templateColors.navy;
  drawDiamondPath(cx, cy, size);
  ctx.fill();

  ctx.fillStyle = templateColors.cyan;
  drawDiamondPath(cx, cy, size - 36);
  ctx.fill();

  ctx.fillStyle = templateColors.paper;
  drawDiamondPath(cx, cy, size - 74);
  ctx.fill();
}

function drawDiamondImage(img, cx, cy, size) {
  drawDiamondPath(cx, cy, size);
  ctx.save();
  ctx.clip();

  const scale = Math.max(size / img.width, size / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const sx = cx - sw / 2;
  const sy = cy - sh / 2;
  ctx.drawImage(img, sx, sy, sw, sh);
  ctx.restore();
}

function drawDiamondFallback(cx, cy, size) {
  ctx.fillStyle = "#d8dee5";
  drawDiamondPath(cx, cy, size);
  ctx.fill();

  ctx.fillStyle = "#4a5566";
  ctx.textAlign = "center";
  ctx.font = "600 46px Segoe UI";
  ctx.fillText("Sin foto", cx, cy + 16);
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawImageOrCircle(src, cx, cy, size, fallbackText) {
  try {
    const img = await loadImage(src);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    ctx.restore();
  } catch {
    ctx.fillStyle = "#f3f7fb";
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = templateColors.navy;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = templateColors.navy;
    ctx.textAlign = "center";
    ctx.font = "700 42px Segoe UI";
    ctx.fillText(fallbackText, cx, cy + 14);
  }
}

async function drawImageOrSquare(src, cx, cy, size) {
  try {
    const img = await loadImage(src);
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  } catch {
    ctx.fillStyle = templateColors.textNavy;
    ctx.font = "700 120px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("^", cx, cy + 40);
  }
}

async function drawTopLogos() {
  const left = { x: 140, y: 170, size: 190 };
  const right = { x: canvas.width - 140, y: 170, size: 190 };
  const icon = { x: canvas.width / 2, y: 110, size: 130 };

  await drawImageOrCircle(
    templateAssets.leftLogo,
    left.x,
    left.y,
    left.size,
    "UAB",
  );
  await drawImageOrCircle(
    templateAssets.rightLogo,
    right.x,
    right.y,
    right.size,
    "SIS",
  );
  await drawImageOrSquare(templateAssets.topIcon, icon.x, icon.y, icon.size);
}

function drawInfoText(student) {
  const w = canvas.width;
  ctx.textAlign = "center";
  ctx.fillStyle = templateColors.textDark;

  ctx.font = "700 53px Segoe UI";
  ctx.fillText("Ha culminado exitosamente la carrera de:", w / 2, 1405);

  ctx.fillStyle = templateColors.textNavy;
  ctx.font = "700 88px Segoe UI";
  ctx.fillText("Ingenieria de Sistemas", w / 2, 1495);

  ctx.fillStyle = templateColors.textDark;
  ctx.font = "700 62px Segoe UI";
  ctx.fillText("Postulante", w / 2, 1588);

  ctx.fillStyle = templateColors.textNavy;
  ctx.font = "700 70px Segoe UI";
  wrapText(student.full_name, w / 2, 1665, 910, 70);

  ctx.fillStyle = templateColors.textDark;
  ctx.font = "700 55px Segoe UI";
  ctx.fillText(`Modalidad: ${student.graduation_mode}`, w / 2, 1765);
  ctx.fillText(`Fecha: ${formatDate(student.graduation_date)}`, w / 2, 1840);

  ctx.fillStyle = templateColors.textDark;
  ctx.font = "700 66px Segoe UI";
  ctx.fillText("UNIVERSIDAD AUTONOMA DEL BENI", w / 2, 1990);
  ctx.fillText('"JOSE BALLIVIAN"', w / 2, 2070);
  ctx.fillText("FACULTAD DE INGENIERIA Y TECNOLOGIA", w / 2, 2150);
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function countWrappedLines(text, maxWidth) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;

  words.forEach((word) => {
    const test = `${line}${word} `;
    const width = ctx.measureText(test).width;
    if (width > maxWidth && line) {
      lines += 1;
      line = `${word} `;
    } else {
      line = test;
    }
  });

  if (line.trim().length > 0) lines += 1;
  return lines;
}

function fitFontSizeForWrappedText({
  text,
  maxWidth,
  maxLines,
  startSize,
  minSize,
  fontWeight = "700",
  fontFamily = "Segoe UI",
}) {
  let size = startSize;
  while (size >= minSize) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    const lines = countWrappedLines(text, maxWidth);
    if (lines <= maxLines) break;
    size -= 2;
  }
  return size;
}

function drawInfoOverlay(student) {
  const w = canvas.width;
  const panel = { x: 110, y: 1210, w: w - 220, h: 340, r: 26 };

  // ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  // drawRoundedRect(panel.x, panel.y, panel.w, panel.h, panel.r);
  // ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = templateColors.textNavy;
  const nameFontSize = fitFontSizeForWrappedText({
    text: student.full_name,
    maxWidth: 900,
    maxLines: 2,
    startSize: 65,
    minSize: 40,
  });
  ctx.font = `700 ${nameFontSize}px Ananda Black Personal Use`;
  const nameLineHeight = Math.round(nameFontSize * 1.05);
  wrapText(student.full_name, w / 2, 1270, 900, nameLineHeight);

  ctx.fillStyle = templateColors.textDark;
  ctx.font = "700 55px Segoe UI";
  ctx.fillText(student.graduation_mode, w / 2, 1590);

  ctx.font = "700 50px Segoe UI";
  ctx.fillText(`Fecha: ${formatDate(student.graduation_date)}`, w / 2, 1670);
}

async function drawPlaceholder() {
  const w = canvas.width;
  const h = canvas.height;

  const hasBg = await drawTemplateBackground(w, h);

  if (!hasBg) {
    ctx.textAlign = "center";
    ctx.fillStyle = templateColors.textNavy;
    ctx.font = "700 96px Segoe UI";
    ctx.fillText("!Muchas", w / 2, 300);
    ctx.fillText("Felicidades!", w / 2, 410);
  }

  ctx.font = "600 48px Segoe UI";
  ctx.fillStyle = templateColors.textDark;
  ctx.fillText("Seleccione un estudiante", w / 2, h / 2 - 150);
}

async function drawPoster(student) {
  if (!student) {
    await drawPlaceholder();
    return;
  }

  const w = canvas.width;
  const h = canvas.height;

  const hasBg = await drawTemplateBackground(w, h);

  if (!hasBg) {
    ctx.textAlign = "center";
    ctx.fillStyle = templateColors.textNavy;
    ctx.font = "700 70px Segoe UI";
    ctx.fillText("!Muchas", w / 2, 300);
    ctx.fillText("Felicidades!", w / 2, 395);
    await drawTopLogos();
  }

  const centerX = w / 2;
  const diamondY = 793;
  const diamondSize = 700;
  drawDiamondFrame(centerX, diamondY, diamondSize);

  if (student.avatar_path) {
    try {
      const img = await loadImage(student.avatar_path);
      drawDiamondImage(img, centerX, diamondY, diamondSize - 40);
    } catch {
      drawDiamondFallback(centerX, diamondY, diamondSize - 40);
    }
  } else {
    drawDiamondFallback(centerX, diamondY, diamondSize - 40);
  }

  if (hasBg) {
    drawInfoOverlay(student);
  } else {
    drawInfoText(student);
  }
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  const lines = [];

  words.forEach((word) => {
    const test = `${line}${word} `;
    const width = ctx.measureText(test).width;
    if (width > maxWidth && line) {
      lines.push(line.trim());
      line = `${word} `;
    } else {
      line = test;
    }
  });

  if (line) lines.push(line.trim());

  const totalHeight = (lines.length - 1) * lineHeight;
  let currentY = y - totalHeight / 2;

  lines.forEach((ln) => {
    ctx.fillText(ln, x, currentY);
    currentY += lineHeight;
  });
}

async function reloadData(keepSelection = true) {
  students = await fetchStudents();
  fillSelect();
  fillList();

  if (keepSelection && selectedStudent) {
    const found = students.find((s) => s.id === selectedStudent.id);
    if (found) {
      selectedStudent = found;
      studentSelect.value = String(found.id);
      await drawPoster(found);
      return;
    }
  }

  selectedStudent = null;
  studentSelect.value = "";
  await drawPlaceholder();
}

studentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const formData = new FormData();
    formData.append("full_name", fullNameEl.value);
    formData.append("graduation_mode", graduationModeEl.value);
    formData.append("graduation_date", graduationDateEl.value);
    if (avatarEl.files[0]) formData.append("avatar", avatarEl.files[0]);

    const res = await fetch(API, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al guardar");

    setStatus("Estudiante guardado correctamente.", "ok");
    studentForm.reset();
    await reloadData(false);
  } catch (error) {
    setStatus(error.message || "Error inesperado", "error");
  }
});

clearFormBtn.addEventListener("click", () => {
  studentForm.reset();
  setStatus("", "ok");
});

studentSelect.addEventListener("change", async () => {
  const id = Number(studentSelect.value);
  selectedStudent = students.find((s) => s.id === id) || null;
  await drawPoster(selectedStudent);
});

studentList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;

  if (action === "select") {
    const found = students.find((s) => s.id === id);
    if (!found) return;
    selectedStudent = found;
    studentSelect.value = String(found.id);
    await drawPoster(found);
    return;
  }

  if (action === "delete") {
    const confirmed = confirm("Desea eliminar este registro?");
    if (!confirmed) return;

    const res = await fetch(`${API}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("No se pudo eliminar el registro.");
      return;
    }

    await reloadData();
  }
});

downloadBtn.addEventListener("click", () => {
  if (!selectedStudent) {
    alert("Seleccione un estudiante primero.");
    return;
  }

  const link = document.createElement("a");
  const safeName = selectedStudent.full_name
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  link.download = `graduado_${safeName || "estudiante"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

refreshBtn.addEventListener("click", async () => {
  await reloadData();
});

(async function init() {
  await ensureFontsLoaded();
  await drawPlaceholder();
  try {
    await reloadData();
  } catch {
    setStatus("No se pudo conectar con el servidor.", "error");
  }
})();



