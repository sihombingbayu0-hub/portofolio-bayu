import type { Theme } from "../types/theme";
import { markStorageIssue } from "./storageHealth";

const THEME_STORAGE_KEY = "uangKuNiTheme";
const themeNames: Theme[] = ["default", "light", "dark"];

// Mengambil tema terakhir yang dipilih pengguna.
export function loadTheme(): Theme {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && !isTheme(savedTheme)) {
      markStorageIssue("tema");
    }
    return isTheme(savedTheme) ? savedTheme : "default";
  } catch {
    markStorageIssue("tema");
    return "default";
  }
}

// Menyimpan tema agar tetap digunakan setelah refresh.
export function saveTheme(theme: Theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

// Menerapkan class tema ke body dan menyesuaikan warna browser mobile.
export function applyTheme(theme: Theme) {
  document.body.classList.remove("theme-default", "theme-light", "theme-dark");
  document.body.classList.add(`theme-${theme}`);

  const themeColor = document.querySelector('meta[name="theme-color"]');

  if (themeColor) {
    themeColor.setAttribute("content", getThemeColor(theme));
  }
}

// Menormalkan input pilihan tema sebelum disimpan.
export function handleThemeChange(value: string): Theme {
  return isTheme(value) ? value : "default";
}

function isTheme(value: string | null): value is Theme {
  return value !== null && themeNames.includes(value as Theme);
}

function getThemeColor(theme: Theme) {
  if (theme === "light") {
    return "#F0E3D3";
  }

  if (theme === "dark") {
    return "#102419";
  }

  return "#1E3C2B";
}
