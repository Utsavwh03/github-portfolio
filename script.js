// Theme toggle with persistence & Bootstrap theme sync
(function () {
  const body = document.body;
  const toggle = document.getElementById("themeToggle");
  const storageKey = "utsav-theme";

  const updateToggleUI = (theme) => {
    if (!toggle) return;
    const isDark = theme === "dark";
    toggle.innerHTML = `
      <i class="bi ${isDark ? "bi-moon-stars" : "bi-sun-fill"}"></i>
      <span>${isDark ? "Dark" : "Light"}</span>
    `;
    toggle.classList.toggle("btn-outline-light", isDark);
    toggle.classList.toggle("btn-outline-dark", !isDark);
  };

  const applyTheme = (theme) => {
    const resolved = theme === "light" ? "light" : "dark";
    body.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-bs-theme", resolved);
    window.localStorage.setItem(storageKey, resolved);
    updateToggleUI(resolved);
  };

  const stored = window.localStorage.getItem(storageKey);
  applyTheme(stored || "light");

  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = body.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }
})();

// Footer year
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
