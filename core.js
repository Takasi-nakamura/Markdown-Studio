/* DATA */

let projects = [
  { id: 1, name: "My First Project", date: "2026.11.15" },
  { id: 2, name: "Website Design", date: "2026.11.14" },
  { id: 3, name: "Study Notes", date: "2026.11.12" },
  { id: 4, name: "Ideas Collection", date: "2026.11.10" }
];

let nextId = 5;
let editingId = null;
let deletingId = null;
let currentProjectId = null;

/* ICONS */

function refreshIcons() {
  lucide.createIcons();
}

/* PAGE */

function showPage(page) {

  if (page === "create") {
    openCreateModal();
    return;
  }

  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });

  const target = document.getElementById(page);

  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.page === page
    );
    btn.classList.remove("preview");
  });

  document.querySelector(".header-label").textContent =
    page === "settings"
      ? "PREFERENCES"
      : "YOUR CREATIVE WORKSPACE";

  refreshIcons();
}

/* NAVIGATION: LONG PRESS + RELEASE TO SELECT */

const nav = document.getElementById("navWrap");
const handle = document.getElementById("navHandle");
const navItems = [...document.querySelectorAll(".nav-item")];

let holdTimer = null;
let expanded = false;
let pointerDown = false;
let longPressed = false;
let previewIndex = 0;
let startX = 0;
let startY = 0;
let pointerId = null;

function getCurrentNavIndex() {
  return navItems.findIndex(btn =>
    btn.classList.contains("active")
  );
}

function expandNav() {
  expanded = true;
  previewIndex = Math.max(0, getCurrentNavIndex());
  nav.classList.add("expanded");
  updateNavPreview();
}

function collapseNav() {
  expanded = false;
  nav.classList.remove("expanded");
  navItems.forEach(item => item.classList.remove("preview"));
}

function updateNavPreview() {
  navItems.forEach((item, index) => {
    item.classList.toggle("preview", index === previewIndex);
  });
}

function updatePreviewFromX(x) {
  const rect = nav.getBoundingClientRect();
  const localX = x - rect.left;

  // 3つのアイコンの中央位置を基準に選択
  const index = Math.round((localX - 55) / 65);

  previewIndex = Math.max(0, Math.min(2, index));
  updateNavPreview();
}

handle.addEventListener("pointerdown", e => {
  e.preventDefault();

  pointerDown = true;
  longPressed = false;
  pointerId = e.pointerId;

  startX = e.clientX;
  startY = e.clientY;

  holdTimer = setTimeout(() => {
    if (!pointerDown) return;

    longPressed = true;
    expandNav();
  }, 350);
});

document.addEventListener("pointermove", e => {
  if (!pointerDown || e.pointerId !== pointerId) return;

  const dx = Math.abs(e.clientX - startX);
  const dy = Math.abs(e.clientY - startY);

  if (!longPressed && (dx > 8 || dy > 8)) {
    clearTimeout(holdTimer);
  }

  if (expanded) {
    updatePreviewFromX(e.clientX);
  }
});

document.addEventListener("pointerup", e => {
  if (!pointerDown || e.pointerId !== pointerId) return;

  clearTimeout(holdTimer);
  pointerDown = false;
  pointerId = null;

  if (expanded) {
    // 指を離した瞬間に初めて画面を切り替える
    const selected = navItems[previewIndex];
    if (selected) {
      setActiveNav(selected);
    }
    collapseNav();
  }
});

document.addEventListener("pointercancel", () => {
  clearTimeout(holdTimer);
  pointerDown = false;
  pointerId = null;
  collapseNav();
});

// 通常のクリック・タップでも展開可能
handle.addEventListener("click", () => {
  if (!expanded) {
    expandNav();
  } else {
    collapseNav();
  }
});

navItems.forEach(btn => {
  btn.addEventListener("click", () => {
    setActiveNav(btn);
    collapseNav();
  });
});

function setActiveNav(btn) {
  showPage(btn.dataset.page);
}

/* CREATE */

function openCreateModal() {
  closeAllMenus();

  document.getElementById("createModal").classList.add("show");

  setTimeout(() => {
    document.getElementById("projectName").focus();
  }, 100);
}

function closeModal() {
  document.getElementById("createModal").classList.remove("show");
}

function createProject() {
  const input = document.getElementById("projectName");
  const name = input.value.trim();

  if (!name) {
    input.focus();
    return;
  }

  const project = {
    id: nextId++,
    name,
    date: formatDate()
  };

  projects.unshift(project);

  input.value = "";
  closeModal();

  renderProjects();

  // 作成直後に編集画面へ
  openEditor(project.id);
}

/* DATE */

function formatDate() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join(".");
}

/* PROJECT RENDER */

function renderProjects(search = "") {

  const grid = document.getElementById("projectGrid");

  const filtered = projects.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  grid.innerHTML = "";

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty">
        <i data-lucide="files" width="34" height="34"></i>
        <p>プロジェクトがありません。</p>
      </div>
    `;

    refreshIcons();
    return;
  }

  filtered.forEach(project => {

    const card = document.createElement("div");
    card.className = "project-card";

    card.innerHTML = `
      <div class="project-top">

        <div class="project-file">
          <i data-lucide="file-text"></i>
        </div>

        <div class="project-menu-wrap">

          <button class="project-menu"
            aria-label="プロジェクトメニュー"
            aria-expanded="false"
            title="メニュー">

            <i data-lucide="more-horizontal"></i>

          </button>

          <div class="context-menu">

            <button class="rename-action">
              <i data-lucide="pencil" width="15"></i>
              名前を変更
            </button>

            <button class="delete-action">
              <i data-lucide="trash-2" width="15"></i>
              削除
            </button>

          </div>

        </div>
      </div>

      <div class="project-name"></div>
      <div class="project-date"></div>
      <span class="project-tag">MARKDOWN</span>
    `;

    card.querySelector(".project-name").textContent = project.name;
    card.querySelector(".project-date").textContent =
      "最終更新 " + project.date;

    // カードをクリックして開く
    card.addEventListener("click", e => {
      if (e.target.closest(".project-menu-wrap")) return;
      openEditor(project.id);
    });

    // 三点リーダー
    const menuButton = card.querySelector(".project-menu");
    const contextMenu = card.querySelector(".context-menu");

    menuButton.addEventListener("click", e => {
      e.stopPropagation();

      const wasOpen = contextMenu.classList.contains("show");

      closeAllMenus();

      if (!wasOpen) {
        contextMenu.classList.add("show");
        menuButton.setAttribute("aria-expanded", "true");
      }
    });

    // 名前変更
    card.querySelector(".rename-action").addEventListener("click", e => {
      e.stopPropagation();
      closeAllMenus();
      openRenameModal(project.id);
    });

    // 削除
    card.querySelector(".delete-action").addEventListener("click", e => {
      e.stopPropagation();
      closeAllMenus();
      openDeleteModal(project.id);
    });

    grid.appendChild(card);
  });

  refreshIcons();
}

function filterProjects() {
  renderProjects(document.getElementById("searchInput").value);
}

/* CLOSE MENUS */

function closeAllMenus() {
  document.querySelectorAll(".context-menu").forEach(menu => {
    menu.classList.remove("show");
  });

  document.querySelectorAll(".project-menu").forEach(button => {
    button.setAttribute("aria-expanded", "false");
  });
}

document.addEventListener("click", e => {
  if (!e.target.closest(".project-menu-wrap")) {
    closeAllMenus();
  }
});

/* RENAME */

function openRenameModal(id) {

  const project = projects.find(p => p.id === id);
  if (!project) return;

  editingId = id;

  const input = document.getElementById("renameInput");
  input.value = project.name;

  document.getElementById("renameModal").classList.add("show");

  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

function closeRenameModal() {
  document.getElementById("renameModal").classList.remove("show");
  editingId = null;
}

function saveRename() {

  const input = document.getElementById("renameInput");
  const name = input.value.trim();

  if (!name || editingId === null) {
    input.focus();
    return;
  }

  const project = projects.find(p => p.id === editingId);

  if (!project) return;

  project.name = name;
  project.date = formatDate();

  if (currentProjectId === editingId) {
    document.getElementById("editorTitle").textContent = name;
  }

  closeRenameModal();
  renderProjects(document.getElementById("searchInput").value);
}

/* DELETE WITH SECOND CONFIRMATION */

function openDeleteModal(id) {

  const project = projects.find(p => p.id === id);
  if (!project) return;

  deletingId = id;

  document.getElementById("deleteTargetName").textContent =
    project.name;

  document.getElementById("deleteModal").classList.add("show");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("show");
  deletingId = null;
}

function confirmDelete() {

  if (deletingId === null) return;

  projects = projects.filter(p => p.id !== deletingId);

  if (currentProjectId === deletingId) {
    currentProjectId = null;
    showPage("projects");
  }

  closeDeleteModal();

  renderProjects(document.getElementById("searchInput").value);
}

/* EDITOR */

function openEditor(id) {

  const project = projects.find(p => p.id === id);
  if (!project) return;

  currentProjectId = id;

  document.getElementById("editorTitle").textContent =
    project.name;

  showPage("editor");

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.remove("active");
  });
}

/* KEYBOARD */

document.getElementById("projectName").addEventListener("keydown", e => {
  if (e.key === "Enter") createProject();
  if (e.key === "Escape") closeModal();
});

document.getElementById("renameInput").addEventListener("keydown", e => {
  if (e.key === "Enter") saveRename();
  if (e.key === "Escape") closeRenameModal();
});

/* MODAL BACKDROP */

document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target !== overlay) return;

    if (overlay.id === "createModal") closeModal();
    if (overlay.id === "renameModal") closeRenameModal();

    // 削除確認は誤操作防止のため背景タップでは閉じない
  });
});

/* INIT */

renderProjects();
refreshIcons();
