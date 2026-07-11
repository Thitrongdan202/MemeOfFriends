const runwayCaptions = [
  "DẠ TIỆC KHÔNG MỜI",
  "GIÁM ĐỐC MÀU XANH",
  "BỊ TRÓI NHƯNG VẪN GIỮ FORM",
  "COUTURE CHỐNG ĐẠN",
  "PHỎNG VẤN CUỐI CÙNG",
  "TĂNG CA HAUTE COUTURE",
  "ĐIỆP VIÊN 0-0-XANH",
  "TỐT NGHIỆP HỆ TRUNG BÌNH",
  "EDITORIAL KHÔNG LƯƠNG",
  "RUNWAY BẾN CẢNG",
  "BỘ SƯU TẬP DÂY THỪNG",
  "CEO CỦA SỰ BẤT ỔN",
  "MẶT LẠNH, LƯƠNG NÓNG",
  "MỐT MÙA NÀY: SỐNG SÓT",
  "ẢNH THẺ NHƯNG CÓ PLOT",
];

const state = {
  memes: [],
  visible: [],
  campaignMemes: [],
  activeIndex: 0,
  heroIndex: 0,
  heroLayer: 0,
  heroRequest: 0,
  heroTimer: 0,
  heroInitialized: false,
  backdropIndex: 0,
  backdropRequest: 0,
  revealTimer: 0,
  wheelLockedUntil: 0,
  suppressClickUntil: 0,
  lastFocusedElement: null,
  scrollFrame: 0,
  pointerFrame: 0,
  drag: {
    active: false,
    pointerId: null,
    startX: 0,
    currentX: 0,
    startedAt: 0,
  },
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
  scrollMeter: document.querySelector("#scrollMeter"),
  campaignHero: document.querySelector("#campaignHero"),
  heroImages: [document.querySelector("#heroImageA"), document.querySelector("#heroImageB")],
  heroCounter: document.querySelector("#heroCounter"),
  heroName: document.querySelector("#heroName"),
  heroProgress: document.querySelector("#heroProgress"),
  heroPrev: document.querySelector("#heroPrev"),
  heroNext: document.querySelector("#heroNext"),
  heroPack: document.querySelector("#heroPackButton"),
  featureImage: document.querySelector("#featureImage"),
  viewer: document.querySelector("#viewer"),
  viewerCounter: document.querySelector("#viewerCounter"),
  viewerTitle: document.querySelector("#viewerTitle"),
  viewerMeta: document.querySelector("#viewerMeta"),
  download: document.querySelector("#downloadButton"),
  closeViewer: document.querySelector("#closeViewer"),
  prev: document.querySelector("#prevButton"),
  next: document.querySelector("#nextButton"),
  packStage: document.querySelector("#packStage"),
  packCarousel: document.querySelector("#packCarousel"),
  packTemplate: document.querySelector("#packCardTemplate"),
  progress: document.querySelector("#viewerProgress"),
  backdrops: [...document.querySelectorAll(".viewer-backdrop")],
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

const paddedIndex = (value, length) => String(value).padStart(Math.max(2, String(length).length), "0");

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8%" },
    )
  : null;

function observeReveals(root = document) {
  const items = root.querySelectorAll(".reveal:not([data-observed])");
  for (const item of items) {
    item.dataset.observed = "true";
    if (reducedMotion.matches || !revealObserver) {
      item.classList.add("is-visible");
    } else {
      revealObserver.observe(item);
    }
  }
}

async function loadMemes() {
  elements.refresh.classList.add("is-loading");
  try {
    const response = await fetch(`/api/memes?ts=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.memes = data.memes || [];
    rebuildFolderOptions();
    applyFilters();
    setFeatureImage();
    restartHeroTimer();
  } catch (error) {
    console.error(error);
    elements.empty.classList.add("is-visible");
    elements.empty.querySelector("h3").textContent = "Runway chưa lên đèn.";
    elements.empty.querySelector("p").textContent = "Kiểm tra lại server Python rồi tải lại trang.";
  } finally {
    elements.refresh.classList.remove("is-loading");
  }
}

function rebuildFolderOptions() {
  const previous = elements.folder.value || "all";
  const folders = [...new Set(state.memes.map((meme) => meme.folder))].sort((a, b) => a.localeCompare(b, "vi"));
  elements.folder.innerHTML = "";
  elements.folder.append(new Option("Tất cả series", "all"));
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
  state.activeIndex = Math.min(state.activeIndex, Math.max(visible.length - 1, 0));
  elements.total.textContent = String(state.memes.length);
  elements.visibleCount.textContent = String(visible.length);
  renderGallery();
  syncCampaign();
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

function syncCampaign() {
  state.campaignMemes = state.visible.length ? state.visible : state.memes;
  state.heroIndex = 0;
  showHero(0, { immediate: !state.heroInitialized });
}

function showHero(index, { immediate = false } = {}) {
  const total = state.campaignMemes.length;
  if (!total) return;

  state.heroIndex = ((index % total) + total) % total;
  const meme = state.campaignMemes[state.heroIndex];
  const requestId = ++state.heroRequest;
  const nextLayer = immediate ? state.heroLayer : (state.heroLayer + 1) % elements.heroImages.length;
  const target = elements.heroImages[nextLayer];

  elements.heroCounter.textContent = `${paddedIndex(state.heroIndex + 1, total)} / ${paddedIndex(total, total)}`;
  elements.heroName.textContent = runwayCaptions[state.heroIndex % runwayCaptions.length];
  elements.heroProgress.style.transform = `scaleX(${(state.heroIndex + 1) / total})`;
  target.src = meme.url;

  const reveal = () => {
    if (requestId !== state.heroRequest) return;
    elements.heroImages.forEach((image, layer) => image.classList.toggle("is-active", layer === nextLayer));
    state.heroLayer = nextLayer;
    state.heroInitialized = true;
    preloadCampaignNeighbors();
  };

  if (immediate || (target.complete && target.naturalWidth)) {
    requestAnimationFrame(reveal);
  } else if (target.decode) {
    target.decode().then(reveal).catch(reveal);
  } else {
    target.onload = reveal;
    target.onerror = reveal;
  }
}

function stepHero(step, userInitiated = true) {
  showHero(state.heroIndex + step);
  if (userInitiated) restartHeroTimer();
}

function restartHeroTimer() {
  window.clearInterval(state.heroTimer);
  if (reducedMotion.matches || state.campaignMemes.length < 2 || document.hidden) return;
  state.heroTimer = window.setInterval(() => {
    if (!elements.viewer.open && !document.hidden) stepHero(1, false);
  }, 5600);
}

function preloadCampaignNeighbors() {
  const total = state.campaignMemes.length;
  if (total < 2) return;
  for (const step of [-1, 1]) {
    const index = (state.heroIndex + step + total) % total;
    const image = new Image();
    image.src = state.campaignMemes[index].url;
  }
}

function setFeatureImage() {
  if (!state.memes.length) return;
  const feature = state.memes[Math.min(3, state.memes.length - 1)];
  elements.featureImage.src = feature.url;
  elements.featureImage.alt = feature.name || feature.filename;
}

function renderGallery() {
  elements.gallery.innerHTML = "";
  elements.empty.classList.toggle("is-visible", state.visible.length === 0);

  const fragment = document.createDocumentFragment();
  for (const [index, meme] of state.visible.entries()) {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const button = card.querySelector(".card-button");
    const image = card.querySelector("img");
    const title = card.querySelector(".card-meta strong");
    const meta = card.querySelector(".card-meta small");
    const lookIndex = card.querySelector(".look-index");
    const caption = runwayCaptions[index % runwayCaptions.length];

    card.classList.add(`look-${index % 6}`);
    image.src = meme.url;
    image.alt = meme.name || meme.filename;
    title.textContent = caption;
    meta.textContent = `${meme.filename} · ${formatBytes(meme.size)} · ${formatDate(meme.updatedAt)}`;
    lookIndex.textContent = `LOOK ${paddedIndex(index + 1, state.visible.length)}`;
    button.setAttribute("aria-label", `Mở ${caption} trong Runway View`);

    button.addEventListener("pointermove", (event) => tiltCard(event, button));
    button.addEventListener("pointerleave", () => resetTilt(button));
    button.addEventListener("click", () => openViewer(index));
    fragment.append(card);
  }

  elements.gallery.append(fragment);
  observeReveals(elements.gallery);
}

function tiltCard(event, button) {
  if (event.pointerType === "touch" || reducedMotion.matches) return;
  const rect = button.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  button.style.setProperty("--rx", `${(-y * 2.4).toFixed(2)}deg`);
  button.style.setProperty("--ry", `${(x * 3.4).toFixed(2)}deg`);
}

function resetTilt(button) {
  button.style.setProperty("--rx", "0deg");
  button.style.setProperty("--ry", "0deg");
}

function shuffleGallery() {
  state.visible = [...state.visible].sort(() => Math.random() - 0.5);
  state.activeIndex = 0;
  renderGallery();
  state.campaignMemes = state.visible.length ? state.visible : state.memes;
  state.heroIndex = 0;
  showHero(0);
  restartHeroTimer();
}

function openHeroInViewer() {
  const current = state.campaignMemes[state.heroIndex];
  if (!current) return;
  let index = state.visible.findIndex((meme) => meme.relativePath === current.relativePath);

  if (index < 0) {
    elements.search.value = "";
    elements.folder.value = "all";
    state.visible = sortMemes(state.memes, elements.sort.value);
    elements.visibleCount.textContent = String(state.visible.length);
    renderGallery();
    index = state.visible.findIndex((meme) => meme.relativePath === current.relativePath);
  }

  openViewer(Math.max(index, 0));
}

function renderPackCards() {
  elements.packCarousel.innerHTML = "";
  elements.progress.innerHTML = "";
  const cards = document.createDocumentFragment();
  const dots = document.createDocumentFragment();

  state.visible.forEach((meme, index) => {
    const card = elements.packTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector("img");
    card.dataset.index = String(index);
    card.setAttribute("aria-label", `Mở ${meme.name || meme.filename}`);
    image.dataset.src = meme.url;
    image.alt = meme.name || meme.filename;
    card.addEventListener("click", () => {
      if (performance.now() < state.suppressClickUntil) return;
      goToViewer(index);
    });
    cards.append(card);

    const dot = document.createElement("button");
    dot.className = "progress-dot";
    dot.type = "button";
    dot.dataset.index = String(index);
    dot.title = meme.name || meme.filename;
    dot.setAttribute("aria-label", `Ảnh ${index + 1}: ${meme.name || meme.filename}`);
    dot.addEventListener("click", () => goToViewer(index));
    dots.append(dot);
  });

  elements.packCarousel.append(cards);
  elements.progress.append(dots);
}

function circularOffset(index, activeIndex, length) {
  let offset = index - activeIndex;
  if (offset > length / 2) offset -= length;
  if (offset < -length / 2) offset += length;
  return offset;
}

function updatePackCard(card, offset) {
  const distance = Math.abs(offset);
  const direction = Math.sign(offset);
  const image = card.querySelector("img");
  const isActive = distance === 0;
  const isNear = distance <= 2;

  const depth = distance === 0 ? 140 : distance === 1 ? -80 : distance === 2 ? -360 : -760;
  const scale = distance === 0 ? 1 : distance === 1 ? 0.78 : distance === 2 ? 0.61 : 0.48;
  const opacity = distance === 0 ? 1 : distance === 1 ? 0.66 : distance === 2 ? 0.24 : 0;
  const rotation = distance === 0 ? 0 : direction * -48;
  const brightness = distance === 0 ? 1 : distance === 1 ? 0.67 : 0.48;
  const saturation = distance === 0 ? 1 : distance === 1 ? 0.78 : 0.62;

  card.style.setProperty("--x", `calc(var(--side-gap) * ${offset})`);
  card.style.setProperty("--z", `${depth}px`);
  card.style.setProperty("--scale", String(scale));
  card.style.setProperty("--opacity", String(opacity));
  card.style.setProperty("--ry", `${rotation}deg`);
  card.style.setProperty("--brightness", String(brightness));
  card.style.setProperty("--saturation", String(saturation));
  card.style.setProperty("--layer", String(20 - Math.min(distance, 19)));
  card.classList.toggle("is-active", isActive);
  card.classList.toggle("is-near", isNear);
  card.setAttribute("aria-hidden", isNear ? "false" : "true");
  card.tabIndex = isActive ? 0 : -1;

  if (distance <= 3 && !image.src) image.src = image.dataset.src;
}

function updateViewer({ immediateBackdrop = false } = {}) {
  const meme = state.visible[state.activeIndex];
  if (!meme) return;

  const cards = [...elements.packCarousel.querySelectorAll(".pack-card")];
  cards.forEach((card, index) => {
    updatePackCard(card, circularOffset(index, state.activeIndex, state.visible.length));
  });

  const dots = [...elements.progress.querySelectorAll(".progress-dot")];
  dots.forEach((dot, index) => {
    const isActive = index === state.activeIndex;
    dot.classList.toggle("is-active", isActive);
    if (isActive) {
      dot.setAttribute("aria-current", "true");
      dot.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "nearest", inline: "center" });
    } else {
      dot.removeAttribute("aria-current");
    }
  });

  elements.viewerCounter.textContent = `${paddedIndex(state.activeIndex + 1, state.visible.length)} / ${paddedIndex(state.visible.length, state.visible.length)}`;
  elements.viewerTitle.textContent = runwayCaptions[state.activeIndex % runwayCaptions.length];
  elements.viewerMeta.textContent = `${meme.filename} · ${formatBytes(meme.size)} · ${formatDate(meme.updatedAt)}`;
  elements.download.href = meme.url;
  elements.download.download = meme.filename;
  setBackdrop(meme.url, immediateBackdrop);
  preloadViewerNeighbors();
}

function setBackdrop(url, immediate = false) {
  const requestId = ++state.backdropRequest;
  const nextIndex = immediate ? state.backdropIndex : (state.backdropIndex + 1) % elements.backdrops.length;
  const target = elements.backdrops[nextIndex];
  const absoluteUrl = new URL(url, window.location.href).href;
  const loader = new Image();
  loader.src = absoluteUrl;

  const reveal = () => {
    if (requestId !== state.backdropRequest) return;
    target.style.backgroundImage = `url(${JSON.stringify(absoluteUrl)})`;
    elements.backdrops.forEach((layer, index) => layer.classList.toggle("is-active", index === nextIndex));
    state.backdropIndex = nextIndex;
  };

  if (immediate) {
    reveal();
    return;
  }

  if (loader.decode) {
    loader.decode().then(reveal).catch(reveal);
  } else {
    loader.onload = reveal;
    loader.onerror = reveal;
  }
}

function preloadViewerNeighbors() {
  const total = state.visible.length;
  if (!total) return;
  for (const step of [-2, -1, 1, 2]) {
    const index = (state.activeIndex + step + total) % total;
    const image = new Image();
    image.src = state.visible[index].url;
  }
}

function openViewer(index) {
  if (!state.visible[index]) return;
  state.lastFocusedElement = document.activeElement;
  state.activeIndex = index;
  renderPackCards();
  updateViewer({ immediateBackdrop: true });
  if (!elements.viewer.open) elements.viewer.showModal();
  document.body.classList.add("viewer-open");
  window.clearInterval(state.heroTimer);
  window.clearTimeout(state.revealTimer);
  elements.viewer.classList.remove("is-revealing");
  requestAnimationFrame(() => {
    elements.viewer.classList.add("is-revealing");
    elements.packStage.focus({ preventScroll: true });
  });
  state.revealTimer = window.setTimeout(() => elements.viewer.classList.remove("is-revealing"), 1150);
}

function closeViewer() {
  if (elements.viewer.open) elements.viewer.close();
}

function goToViewer(index) {
  const total = state.visible.length;
  if (!total) return;
  const nextIndex = ((index % total) + total) % total;
  if (nextIndex === state.activeIndex) return;
  state.activeIndex = nextIndex;
  updateViewer();
}

function nextViewer(step) {
  goToViewer(state.activeIndex + step);
}

function startDrag(event) {
  if (event.button !== 0 || !elements.viewer.open) return;
  state.drag.active = true;
  state.drag.pointerId = event.pointerId;
  state.drag.startX = event.clientX;
  state.drag.currentX = event.clientX;
  state.drag.startedAt = performance.now();
  elements.packStage.classList.add("is-dragging");
  elements.packStage.setPointerCapture(event.pointerId);
}

function moveDrag(event) {
  if (!state.drag.active || event.pointerId !== state.drag.pointerId) return;
  state.drag.currentX = event.clientX;
  const delta = Math.max(-180, Math.min(180, state.drag.currentX - state.drag.startX));
  elements.packStage.style.setProperty("--drag-x", `${delta}px`);
  if (Math.abs(delta) > 8) state.suppressClickUntil = performance.now() + 360;
}

function finishDrag(event) {
  if (!state.drag.active || event.pointerId !== state.drag.pointerId) return;
  const delta = state.drag.currentX - state.drag.startX;
  const elapsed = Math.max(performance.now() - state.drag.startedAt, 1);
  const velocity = delta / elapsed;
  const shouldMove = Math.abs(delta) > 52 || Math.abs(velocity) > 0.42;

  state.drag.active = false;
  state.drag.pointerId = null;
  elements.packStage.classList.remove("is-dragging");
  elements.packStage.style.setProperty("--drag-x", `${Math.max(-180, Math.min(180, delta))}px`);
  requestAnimationFrame(() => {
    elements.packStage.style.setProperty("--drag-x", "0px");
    if (shouldMove) nextViewer(delta < 0 ? 1 : -1);
  });
}

function handleWheel(event) {
  if (!elements.viewer.open || state.visible.length < 2) return;
  event.preventDefault();
  const now = performance.now();
  if (now < state.wheelLockedUntil) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (Math.abs(delta) < 12) return;
  state.wheelLockedUntil = now + 460;
  nextViewer(delta > 0 ? 1 : -1);
}

function updateScrollMeter() {
  const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
  elements.scrollMeter.style.transform = `scaleX(${progress})`;
  state.scrollFrame = 0;
}

function requestScrollMeterUpdate() {
  if (state.scrollFrame) return;
  state.scrollFrame = requestAnimationFrame(updateScrollMeter);
}

function handleHeroPointer(event) {
  if (reducedMotion.matches || event.pointerType === "touch") return;
  if (state.pointerFrame) cancelAnimationFrame(state.pointerFrame);
  const rect = elements.campaignHero.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * -16;
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * -10;
  state.pointerFrame = requestAnimationFrame(() => {
    elements.campaignHero.style.setProperty("--parallax-x", `${x.toFixed(2)}px`);
    elements.campaignHero.style.setProperty("--parallax-y", `${y.toFixed(2)}px`);
  });
}

function resetHeroPointer() {
  elements.campaignHero.style.setProperty("--parallax-x", "0px");
  elements.campaignHero.style.setProperty("--parallax-y", "0px");
}

elements.search.addEventListener("input", applyFilters);
elements.folder.addEventListener("change", applyFilters);
elements.sort.addEventListener("change", applyFilters);
elements.refresh.addEventListener("click", loadMemes);
elements.shuffle.addEventListener("click", shuffleGallery);
elements.focus.addEventListener("click", openHeroInViewer);
elements.heroPack.addEventListener("click", openHeroInViewer);
elements.heroPrev.addEventListener("click", () => stepHero(-1));
elements.heroNext.addEventListener("click", () => stepHero(1));
elements.closeViewer.addEventListener("click", closeViewer);
elements.prev.addEventListener("click", () => nextViewer(-1));
elements.next.addEventListener("click", () => nextViewer(1));

elements.campaignHero.addEventListener("pointermove", handleHeroPointer);
elements.campaignHero.addEventListener("pointerleave", resetHeroPointer);
elements.packStage.addEventListener("pointerdown", startDrag);
elements.packStage.addEventListener("pointermove", moveDrag);
elements.packStage.addEventListener("pointerup", finishDrag);
elements.packStage.addEventListener("pointercancel", finishDrag);
elements.packStage.addEventListener("wheel", handleWheel, { passive: false });

elements.viewer.addEventListener("close", () => {
  document.body.classList.remove("viewer-open");
  elements.viewer.classList.remove("is-revealing");
  elements.packStage.style.setProperty("--drag-x", "0px");
  restartHeroTimer();
  if (state.lastFocusedElement?.isConnected) state.lastFocusedElement.focus({ preventScroll: true });
});

window.addEventListener("keydown", (event) => {
  if (!elements.viewer.open) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    nextViewer(-1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    nextViewer(1);
  }
  if (event.key === "Escape") closeViewer();
});

window.addEventListener("scroll", requestScrollMeterUpdate, { passive: true });
window.addEventListener("resize", requestScrollMeterUpdate);
document.addEventListener("visibilitychange", restartHeroTimer);
reducedMotion.addEventListener?.("change", restartHeroTimer);

observeReveals();
updateScrollMeter();
loadMemes();
