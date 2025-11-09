// Dark / light theme toggle with localStorage
(function () {
  const body = document.body;
  const toggle = document.getElementById("themeToggle");
  const stored = window.localStorage.getItem("utsav-theme");

  if (stored === "light") {
    body.setAttribute("data-theme", "light");
    if (toggle) toggle.textContent = "🌞";
  } else {
    body.setAttribute("data-theme", "dark");
    if (toggle) toggle.textContent = "🌙";
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = body.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      body.setAttribute("data-theme", next);
      window.localStorage.setItem("utsav-theme", next);
      toggle.textContent = next === "dark" ? "🌙" : "🌞";
    });
  }
})();

// Mobile nav toggle
(function () {
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  if (!navToggle || !navLinks) return;

  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("nav__links--open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("nav__links--open");
    });
  });
})();

// Footer year
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
