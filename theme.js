const themeRoot = document.documentElement;
const themeButtons = Array.from(document.querySelectorAll("[data-theme-toggle]"));

const getStoredTheme = () => {
  try {
    return localStorage.getItem("portfolio-theme");
  } catch (error) {
    return null;
  }
};

const storeTheme = (theme) => {
  try {
    localStorage.setItem("portfolio-theme", theme);
  } catch (error) {}
};

const applyTheme = (theme) => {
  const isDark = theme === "dark";

  if (isDark) {
    themeRoot.dataset.theme = "dark";
  } else {
    delete themeRoot.dataset.theme;
  }

  themeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap");
    button.setAttribute("title", isDark ? "Mode terang" : "Mode gelap");
  });
};

const initialTheme = themeRoot.dataset.theme === "dark" ? "dark" : getStoredTheme() || "light";
applyTheme(initialTheme);

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextTheme = themeRoot.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    storeTheme(nextTheme);
  });
});
