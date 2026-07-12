import type { BackupData, BackupValidationResult, DataMessage } from "../types/backup";
import type { Category } from "../types/category";
import type { SavingsGoal } from "../types/savingsGoal";
import type { Transaction } from "../types/transaction";

const APP_NAME = "Uang Ku Ni";
const APP_VERSION = "1.0.0";
const JSON_MIME_TYPE = "application/json";
const CSV_MIME_TYPE = "text/csv;charset=utf-8";

// Membuat file backup dari seluruh data aplikasi.
export function exportBackupJSON(
  transactions: Transaction[],
  categories: Category[],
  savingsGoals: SavingsGoal[]
): BackupData {
  const backupData: BackupData = {
    transactions,
    categories,
    savingsGoals,
    exportedAt: new Date().toISOString(),
    appName: APP_NAME,
    version: APP_VERSION
  };

  downloadFile(
    JSON.stringify(backupData, null, 2),
    `uang-ku-ni-backup-${getDateStamp()}.json`,
    JSON_MIME_TYPE
  );

  return backupData;
}

// Membaca file JSON yang dipilih pengguna, tetapi belum menyimpan datanya.
export async function importBackupJSON(file: File): Promise<BackupValidationResult> {
  const isJsonFile = file.name.toLowerCase().endsWith(".json") || file.type === JSON_MIME_TYPE;

  if (!isJsonFile) {
    return invalidBackup("Pilih file JSON (.json).");
  }

  try {
    const fileText = await file.text();
    const parsedData: unknown = JSON.parse(fileText);
    return validateBackupData(parsedData);
  } catch {
    return invalidBackup("File JSON tidak bisa dibaca.");
  }
}

// Memastikan backup mempunyai metadata dan tiga kumpulan data utama.
export function validateBackupData(input: unknown): BackupValidationResult {
  if (!isRecord(input)) {
    return invalidBackup("Format file tidak sesuai.");
  }

  const hasRequiredMetadata = ["exportedAt", "appName", "version"].every(
    (key) => typeof input[key] === "string" && input[key]
  );

  if (!hasRequiredMetadata) {
    return invalidBackup("Format file tidak sesuai. Metadata backup tidak lengkap.");
  }

  if (!Array.isArray(input.transactions) || !Array.isArray(input.categories) || !Array.isArray(input.savingsGoals)) {
    return invalidBackup("Format file tidak sesuai. Data utama backup tidak lengkap.");
  }

  if (!input.transactions.every(isValidTransaction)) {
    return invalidBackup("Format file tidak sesuai. Data transaksi tidak valid.");
  }

  if (!input.categories.every(isValidCategory)) {
    return invalidBackup("Format file tidak sesuai. Data kategori tidak valid.");
  }

  if (!input.savingsGoals.every(isValidSavingsGoal)) {
    return invalidBackup("Format file tidak sesuai. Data target tabungan tidak valid.");
  }

  return {
    valid: true,
    message: "",
    data: {
      transactions: input.transactions as Transaction[],
      categories: input.categories as Category[],
      savingsGoals: input.savingsGoals as SavingsGoal[],
      exportedAt: input.exportedAt as string,
      appName: input.appName as string,
      version: input.version as string
    }
  };
}

// Membuat CSV yang aman untuk nilai berisi koma, kutip, atau baris baru.
export function exportTransactionsCSV(transactions: Transaction[]): string {
  const headers = ["tanggal", "jenis", "kategori", "nominal", "keterangan", "createdAt"];
  const rows = transactions.map((transaction) => [
    transaction.tanggal,
    transaction.jenis,
    transaction.kategori,
    transaction.nominal,
    transaction.keterangan,
    transaction.waktuDibuat
  ]);
  const csvContent = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");

  downloadFile(
    `\uFEFF${csvContent}`,
    `transaksi-uang-ku-ni-${getDateStamp()}.csv`,
    CSV_MIME_TYPE
  );

  return csvContent;
}

// Menghapus tiga sumber data utama. State React akan direset oleh App setelahnya.
export function resetAllData() {
  localStorage.removeItem("uangKuNiTransactions");
  localStorage.removeItem("uangKuNiCategories");
  localStorage.removeItem("uangKuNiSavingsGoals");
}

// Menyatukan format pesan status yang ditampilkan pada halaman Pengaturan.
export function showDataMessage(text: string, type: DataMessage["type"]): DataMessage {
  return { text, type };
}

// Menyiapkan file unduhan tanpa library tambahan.
export function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function invalidBackup(message: string): BackupValidationResult {
  return {
    valid: false,
    message,
    data: null
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (typeof value.id === "number" || typeof value.id === "string") &&
    typeof value.tanggal === "string" &&
    isValidDateValue(value.tanggal) &&
    (value.jenis === "pemasukan" || value.jenis === "pengeluaran") &&
    typeof value.kategori === "string" &&
    Boolean(value.kategori.trim()) &&
    typeof value.nominal === "number" &&
    Number.isFinite(value.nominal) &&
    value.nominal > 0 &&
    typeof value.keterangan === "string" &&
    typeof value.waktuDibuat === "string" &&
    isValidDateTime(value.waktuDibuat)
  );
}

function isValidCategory(value: unknown): value is Category {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.nama === "string" &&
    Boolean(value.nama.trim()) &&
    (value.jenis === "pemasukan" || value.jenis === "pengeluaran") &&
    typeof value.ikon === "string" &&
    Boolean(value.ikon.trim()) &&
    typeof value.waktuDibuat === "string" &&
    isValidDateTime(value.waktuDibuat)
  );
}

function isValidSavingsGoal(value: unknown): value is SavingsGoal {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (typeof value.id === "number" || typeof value.id === "string") &&
    typeof value.namaTarget === "string" &&
    Boolean(value.namaTarget.trim()) &&
    typeof value.nominalTarget === "number" &&
    Number.isFinite(value.nominalTarget) &&
    value.nominalTarget > 0 &&
    typeof value.nominalTerkumpul === "number" &&
    Number.isFinite(value.nominalTerkumpul) &&
    value.nominalTerkumpul >= 0 &&
    value.nominalTerkumpul <= value.nominalTarget &&
    typeof value.catatan === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isValidDateTime(value.createdAt) &&
    isValidDateTime(value.updatedAt) &&
    (value.deadline === undefined || (typeof value.deadline === "string" && isValidDateValue(value.deadline)))
  );
}

function escapeCsvValue(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function getDateStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function isValidDateTime(value: string) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}
