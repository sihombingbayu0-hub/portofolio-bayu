const STORAGE_WARNING_KEY = "uangKuNiStorageWarnings";

export type StorageArea = "transaksi" | "kategori" | "target tabungan" | "tema";

// Peringatan disimpan di sessionStorage agar data localStorage yang rusak tidak ikut dihapus.
export function markStorageIssue(area: StorageArea) {
  try {
    const currentWarnings = JSON.parse(sessionStorage.getItem(STORAGE_WARNING_KEY) || "[]");
    const warnings = Array.isArray(currentWarnings) ? currentWarnings : [];
    sessionStorage.setItem(STORAGE_WARNING_KEY, JSON.stringify([...new Set([...warnings, area])]));
  } catch {
    // Aplikasi tetap berjalan jika sessionStorage juga tidak tersedia.
  }
}

export function consumeStorageIssues(): StorageArea[] {
  try {
    const currentWarnings = JSON.parse(sessionStorage.getItem(STORAGE_WARNING_KEY) || "[]");
    sessionStorage.removeItem(STORAGE_WARNING_KEY);
    return Array.isArray(currentWarnings) ? currentWarnings as StorageArea[] : [];
  } catch {
    return [];
  }
}
