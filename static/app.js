const state = {
  memes: [],
  visible: [],
  activeIndex: 0,
};

const elements = {
  gallery: document.querySelector("#galleryGrid"),
  template: document.querySelector("#cardTemplate"),
  empty: document.querySelector("#emptyState"),
  search: document.querySelector("#searchInput"),
  folder: document.querySelector("#folderSelect"),
  sort: document.querySelector("#sortSelect"),
  total: document.querySelector("#totalCount"),
  visibleCount: document.querySelector("#visibleCount"),
  folderCount: document.querySelector("#folderCount"),
  refresh: document.querySelector("#refreshButton"),
  shuffle: document.querySelector("#shuffleButton"),
  focus: document.querySelector("#focusButton"),
  viewer: document.querySelector("#viewer"),
  viewerImage: document.querySelector("#viewerImage"),
  viewerTitle: document.querySelector("#viewerTitle"),
  viewerMeta: document.querySelector("#viewerMeta"),
  download: document.querySelector("#downloadButton"),
  closeViewer: document.querySelector("#closeViewer"),
  prev: document.querySelector("#prevButton"),
  next: document.querySelector("#nextButton"),
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

async function loadMemes() {
  elements.refresh.classList.add("is-loading");
  try {
    const response = await fetch(`/api/memes?ts=${Date.now()}`);
    const data = await response.json();
    state.memes = data.memes || [];
    rebuildFolderOptions();
    applyFilters();
  } catch (error) {
    console.error(error);
    elements.empty.classList.add("is-visible");
    elements.empty.querySelector("h2").textContent = "Không tải được gallery";
    elements.empty.querySelector("p").textContent = "Kiểm tra lại server Python rồi refresh trang.";
  } finally {
    elements.refresh.classList.remove("is-loading");
  }
}

function rebuildFolderOptions() {
  const previous = elements.folder.value || "all";
  const folders = [...new Set(state.memes.map((meme) => meme.folder))].sort((a, b) => a.localeCompare(b, "vi"));
  elements.folder.innerHTML = "";
  elements.folder.append(new Option("Tất cả", "all"));
  for (const folder of folders) {
    elements.folder.append(new Option(folder, folder));
  }
  elements.folder.value = folders.includes(previous) ? previous : "all";
  elements.folderCount.textContent = String(folders.length);
}

function applyFilters() {
  const query = elements.search.value.trim().toLowerCase();
  const folder = elements.folder.value;

  let visible = state.memes.filter((meme) => {
    const matchesFolder = folder === "all" || meme.folder === folder;
    const haystack = `${meme.name} ${meme.filename} ${meme.folder} ${meme.relativePath}`.toLowerCase();
    return matchesFolder && haystack.includes(query);
  });

  visible = sortMemes(visible, elements.sort.value);
  state.visible = visible;
  elements.total.textContent = String(state.memes.length);
  elements.visibleCount.textContent = String(visible.length);
  renderGallery();
}

function sortMemes(memes, mode) {
  const next = [...memes];
  if (mode === "oldest") {
    next.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  } else if (mode === "name") {
    next.sort((a, b) => a.filename.localeCompare(b.filename, "vi"));
  } else if (mode === "size") {
    next.sort((a, b) => b.size - a.size);
  } else {
    next.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  return next;
}

function renderGallery() {
  elements.gallery.innerHTML = "";
  elements.empty.classList.toggle("is-visible", state.visible.length === 0);

  const fragment = document.createDocumentFragment();
  for (const [index, meme] of state.visible.entries()) {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const button = card.querySelector(".card-button");
    const image = card.querySelector("img");
    const title = card.querySelector("strong");
    const meta = card.querySelector("small");

    card.style.animationDelay = `${Math.min(index * 18, 360)}ms`;
    image.src = meme.url;
    image.alt = meme.name;
    title.textContent = meme.name || meme.filename;
    meta.textContent = `${meme.folder} · ${formatBytes(meme.size)} · ${formatDate(meme.updatedAt)}`;

    button.addEventListener("pointermove", (event) => tiltCard(event, button));
    button.addEventListener("pointerleave", () => resetTilt(button));
    button.addEventListener("click", () => openViewer(index));
    fragment.append(card);
  }
  elements.gallery.append(fragment);
}

function tiltCard(event, button) {
  const rect = button.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  button.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
  button.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`);
}

function resetTilt(button) {
  button.style.setProperty("--rx", "0deg");
  button.style.setProperty("--ry", "0deg");
}

function shuffleGallery() {
  state.visible = [...state.visible].sort(() => Math.random() - 0.5);
  renderGallery();
}

function openViewer(index) {
  if (!state.visible[index]) return;
  state.activeIndex = index;
  updateViewer();
  if (!elements.viewer.open) {
    elements.viewer.showModal();
  }
}

function updateViewer() {
  const meme = state.visible[state.activeIndex];
  elements.viewerImage.src = meme.url;
  elements.viewerImage.alt = meme.name;
  elements.viewerTitle.textContent = meme.filename;
  elements.viewerMeta.textContent = `${meme.folder} · ${formatBytes(meme.size)} · ${formatDate(meme.updatedAt)}`;
  elements.download.href = meme.url;
  elements.download.download = meme.filename;
}

function nextViewer(step) {
  if (!state.visible.length) return;
  state.activeIndex = (state.activeIndex + step + state.visible.length) % state.visible.length;
  updateViewer();
}

elements.search.addEventListener("input", applyFilters);
elements.folder.addEventListener("change", applyFilters);
elements.sort.addEventListener("change", applyFilters);
elements.refresh.addEventListener("click", loadMemes);
elements.shuffle.addEventListener("click", shuffleGallery);
elements.focus.addEventListener("click", () => document.body.classList.toggle("focus-mode"));
elements.closeViewer.addEventListener("click", () => elements.viewer.close());
elements.prev.addEventListener("click", () => nextViewer(-1));
elements.next.addEventListener("click", () => nextViewer(1));

elements.viewer.addEventListener("click", (event) => {
  if (event.target === elements.viewer) {
    elements.viewer.close();
  }
});

window.addEventListener("keydown", (event) => {
  if (!elements.viewer.open) return;
  if (event.key === "ArrowLeft") nextViewer(-1);
  if (event.key === "ArrowRight") nextViewer(1);
  if (event.key === "Escape") elements.viewer.close();
});

loadMemes();
