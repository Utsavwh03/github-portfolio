// Theme toggle -------------------------------------------------------
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");
  const label = toggle ? toggle.querySelector(".theme-toggle-label") : null;
  const storageKey = "utsav-theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const currentTheme = () => root.getAttribute("data-theme") || (media.matches ? "dark" : "light");

  const updateLabel = () => {
    if (!label) return;
    // The button names the theme it switches to.
    label.textContent = currentTheme() === "dark" ? "Light" : "Dark";
  };

  const setTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(storageKey, theme);
    } catch (e) {
      /* storage unavailable; the theme still applies for this visit */
    }
    updateLabel();
    document.dispatchEvent(new CustomEvent("themechange"));
  };

  if (toggle) {
    toggle.addEventListener("click", () => setTheme(currentTheme() === "dark" ? "light" : "dark"));
  }
  media.addEventListener("change", () => {
    updateLabel();
    document.dispatchEvent(new CustomEvent("themechange"));
  });
  updateLabel();
})();

// Footer year --------------------------------------------------------
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
