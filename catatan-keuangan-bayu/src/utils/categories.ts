import type { Category, CategoryGroups, CategoryInput, DeleteCategoryResult } from "../types/category";
import type { Transaction, TransactionType } from "../types/transaction";
import { markStorageIssue } from "./storageHealth";

const CATEGORY_STORAGE_KEY = "uangKuNiCategories";

const defaultCategories: Category[] = [
  createDefaultCategory("income-gaji", "Gaji", "pemasukan", "💼", "#1f6f4c"),
  createDefaultCategory("income-freelance", "Freelance", "pemasukan", "💻", "#1f6f4c"),
  createDefaultCategory("income-bonus", "Bonus", "pemasukan", "⭐", "#1f6f4c"),
  createDefaultCategory("income-hadiah", "Hadiah", "pemasukan", "🎁", "#1f6f4c"),
  createDefaultCategory("income-lainnya", "Lainnya", "pemasukan", "💰", "#1f6f4c"),
  createDefaultCategory("expense-makan", "Makan", "pengeluaran", "🍜", "#a94f36"),
  createDefaultCategory("expense-transportasi", "Transportasi", "pengeluaran", "🚌", "#a94f36"),
  createDefaultCategory("expense-pulsa", "Pulsa", "pengeluaran", "📱", "#a94f36"),
  createDefaultCategory("expense-belanja", "Belanja", "pengeluaran", "🛍️", "#a94f36"),
  createDefaultCategory("expense-kopi", "Kopi", "pengeluaran", "☕", "#a94f36"),
  createDefaultCategory("expense-kuliah", "Kuliah", "pengeluaran", "🎓", "#a94f36"),
  createDefaultCategory("expense-tagihan", "Tagihan", "pengeluaran", "🧾", "#a94f36"),
  createDefaultCategory("expense-lainnya", "Lainnya", "pengeluaran", "💸", "#a94f36")
];

// Mengambil kategori dari localStorage. Kalau belum ada, pakai kategori bawaan.
export function loadCategories(): Category[] {
  try {
    const savedCategories = localStorage.getItem(CATEGORY_STORAGE_KEY);

    if (!savedCategories) {
      return renderCategories(defaultCategories).pemasukan.concat(renderCategories(defaultCategories).pengeluaran);
    }

    const parsedCategories = JSON.parse(savedCategories);

    if (!Array.isArray(parsedCategories)) {
      markStorageIssue("kategori");
      return [...defaultCategories];
    }

    const normalizedCategories = parsedCategories.map(normalizeCategory).filter(Boolean) as Category[];
    if (normalizedCategories.length !== parsedCategories.length || normalizedCategories.length === 0) {
      markStorageIssue("kategori");
    }

    return normalizedCategories.length > 0 ? normalizeCategoryOrder(normalizedCategories) : [...defaultCategories];
  } catch {
    markStorageIssue("kategori");
    return [...defaultCategories];
  }
}

// Menyimpan kategori agar tetap ada setelah aplikasi dibuka ulang.
export function saveCategories(categories: Category[]) {
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

// Membagi kategori menjadi pemasukan dan pengeluaran untuk tampilan.
export function renderCategories(categories: Category[]): CategoryGroups {
  const orderedCategories = normalizeCategoryOrder(categories);

  return {
    pemasukan: orderedCategories.filter((category) => category.jenis === "pemasukan"),
    pengeluaran: orderedCategories.filter((category) => category.jenis === "pengeluaran")
  };
}

export function addCategory(categories: Category[], data: CategoryInput): Category[] {
  const newCategory: Category = {
    id: `category-${Date.now()}`,
    nama: data.nama.trim(),
    jenis: data.jenis,
    ikon: data.ikon.trim() || "•",
    warna: data.warna,
    waktuDibuat: new Date().toISOString()
  };

  return normalizeCategoryOrder([...categories, newCategory]);
}

// Mengambil satu kategori untuk dimasukkan ke form edit.
export function editCategory(categories: Category[], id: string): Category | null {
  return categories.find((category) => category.id === id) ?? null;
}

export function updateCategory(categories: Category[], id: string, data: CategoryInput): Category[] {
  return normalizeCategoryOrder(
    categories.map((category) => {
      if (category.id !== id) {
        return category;
      }

      return {
        ...category,
        nama: data.nama.trim(),
        jenis: data.jenis,
        ikon: data.ikon.trim() || "•",
        warna: data.warna
      };
    })
  );
}

// Kategori yang masih dipakai transaksi tidak dihapus agar data lama tetap rapi.
export function deleteCategory(
  categories: Category[],
  id: string,
  transactions: Transaction[]
): DeleteCategoryResult {
  const selectedCategory = editCategory(categories, id);

  if (!selectedCategory) {
    return {
      categories,
      error: "Kategori tidak ditemukan."
    };
  }

  const isUsed = transactions.some((transaction) => {
    return transaction.jenis === selectedCategory.jenis && transaction.kategori === selectedCategory.nama;
  });

  if (isUsed) {
    return {
      categories,
      error: "Kategori ini masih digunakan di transaksi."
    };
  }

  return {
    categories: normalizeCategoryOrder(categories.filter((category) => category.id !== id)),
    error: ""
  };
}

// Menyiapkan opsi kategori untuk dropdown transaksi sesuai jenis yang dipilih.
export function renderTransactionCategoryOptions(
  categories: Category[],
  type: "" | TransactionType,
  currentCategory = ""
): Category[] {
  if (!type) {
    return [];
  }

  const options = getCategoriesByType(categories, type);
  const hasCurrentCategory = options.some((category) => category.nama === currentCategory);

  if (!currentCategory || hasCurrentCategory) {
    return options;
  }

  return [
    ...options,
    {
      id: `temporary-${type}-${currentCategory}`,
      nama: currentCategory,
      jenis: type,
      ikon: "•",
      waktuDibuat: new Date().toISOString()
    }
  ];
}

export function getCategoriesByType(categories: Category[], type: TransactionType): Category[] {
  return normalizeCategoryOrder(categories).filter((category) => category.jenis === type);
}

function createDefaultCategory(
  id: string,
  nama: string,
  jenis: TransactionType,
  ikon: string,
  warna: string
): Category {
  return {
    id,
    nama,
    jenis,
    ikon,
    warna,
    waktuDibuat: "2026-01-01T00:00:00.000Z"
  };
}

function normalizeCategory(category: Partial<Category>): Category | null {
  if (category.jenis !== "pemasukan" && category.jenis !== "pengeluaran") {
    return null;
  }

  const name = String(category.nama || "").trim();

  if (!name) {
    return null;
  }

  return {
    id: String(category.id || `category-${Date.now()}`),
    nama: name,
    jenis: category.jenis,
    ikon: String(category.ikon || "•").trim(),
    warna: category.warna ? String(category.warna) : undefined,
    waktuDibuat: String(category.waktuDibuat || new Date().toISOString())
  };
}

function normalizeCategoryOrder(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    if (a.jenis !== b.jenis) {
      return a.jenis === "pemasukan" ? -1 : 1;
    }

    return a.nama.localeCompare(b.nama, "id-ID");
  });
}
