import type {
  CategoryReport,
  IncomeExpenseChartItem,
  MonthlyCharts,
  Summary,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionType
} from "../types/transaction";
import { markStorageIssue } from "./storageHealth";

const STORAGE_KEY = "uangKuNiTransactions";

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const defaultFilters: TransactionFilters = {
  jenis: "semua",
  kategori: "semua",
  bulan: "",
  keyword: ""
};

// Mengambil data dari localStorage saat aplikasi pertama kali dibuka.
export function loadTransactions(): Transaction[] {
  try {
    const savedTransactions = localStorage.getItem(STORAGE_KEY);

    if (!savedTransactions) {
      return [];
    }

    const parsedTransactions = JSON.parse(savedTransactions);

    if (!Array.isArray(parsedTransactions)) {
      markStorageIssue("transaksi");
      return [];
    }

    const normalizedTransactions = parsedTransactions.map(normalizeTransaction).filter(Boolean) as Transaction[];
    if (normalizedTransactions.length !== parsedTransactions.length) {
      markStorageIssue("transaksi");
    }
    return renderTransactions(normalizedTransactions);
  } catch {
    markStorageIssue("transaksi");
    return [];
  }
}

// Menyimpan data terbaru ke localStorage agar tidak hilang saat refresh.
export function saveTransactions(transactions: Transaction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// Membuat data transaksi baru lalu menaruhnya di urutan paling atas.
export function addTransaction(transactions: Transaction[], data: TransactionInput): Transaction[] {
  const newTransaction: Transaction = {
    id: Date.now(),
    tanggal: data.tanggal,
    jenis: data.jenis,
    kategori: data.kategori,
    nominal: data.nominal,
    keterangan: data.keterangan || "Tanpa keterangan",
    waktuDibuat: new Date().toISOString()
  };

  return renderTransactions([newTransaction, ...transactions]);
}

// Mengambil satu transaksi untuk dimasukkan kembali ke form edit.
export function editTransaction(transactions: Transaction[], id: number): Transaction | null {
  return transactions.find((transaction) => transaction.id === id) ?? null;
}

// Mengganti data lama dengan data baru, tetapi waktu dibuat tetap dipertahankan.
export function updateTransaction(transactions: Transaction[], id: number, data: TransactionInput): Transaction[] {
  const updatedTransactions = transactions.map((transaction) => {
    if (transaction.id !== id) {
      return transaction;
    }

    return {
      ...transaction,
      tanggal: data.tanggal,
      jenis: data.jenis,
      kategori: data.kategori,
      nominal: data.nominal,
      keterangan: data.keterangan || "Tanpa keterangan"
    };
  });

  return renderTransactions(updatedTransactions);
}

// Menghapus satu transaksi berdasarkan id.
export function deleteTransaction(transactions: Transaction[], id: number): Transaction[] {
  return renderTransactions(transactions.filter((transaction) => transaction.id !== id));
}

// Menghapus semua transaksi dari localStorage dan mengembalikan array kosong.
export function clearAllTransactions(): Transaction[] {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}

// Di React, fungsi ini menyiapkan urutan data sebelum ditampilkan ke layar.
export function renderTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    return new Date(b.waktuDibuat).getTime() - new Date(a.waktuDibuat).getTime();
  });
}

// Menyaring data hanya untuk tampilan daftar, bukan untuk ringkasan saldo utama.
export function getFilteredTransactions(transactions: Transaction[], filters: TransactionFilters): Transaction[] {
  const keyword = filters.keyword.trim().toLowerCase();

  return renderTransactions(transactions).filter((transaction) => {
    const matchesType = filters.jenis === "semua" || transaction.jenis === filters.jenis;
    const matchesCategory = filters.kategori === "semua" || transaction.kategori === filters.kategori;
    const matchesMonth = !filters.bulan || transaction.tanggal.startsWith(filters.bulan);
    const matchesKeyword = !keyword || transaction.keterangan.toLowerCase().includes(keyword);

    return matchesType && matchesCategory && matchesMonth && matchesKeyword;
  });
}

// Mengambil kategori unik dari transaksi agar pilihan filter selalu mengikuti data.
export function renderCategoryFilter(transactions: Transaction[]): string[] {
  const categorySet = new Set(
    transactions
      .map((transaction) => transaction.kategori.trim())
      .filter(Boolean)
  );

  return [...categorySet].sort((a, b) => a.localeCompare(b, "id-ID"));
}

export function resetFilters(): TransactionFilters {
  return { ...defaultFilters };
}

export function handleFilterChange(
  currentFilters: TransactionFilters,
  field: keyof TransactionFilters,
  value: string
): TransactionFilters {
  return {
    ...currentFilters,
    [field]: value
  };
}

// Mengambil transaksi yang tanggalnya sesuai bulan laporan, format bulan: YYYY-MM.
export function getSelectedMonthTransactions(transactions: Transaction[], selectedMonth: string): Transaction[] {
  if (!selectedMonth) {
    return [];
  }

  return renderTransactions(transactions).filter((transaction) => transaction.tanggal.startsWith(selectedMonth));
}

// Menghitung rekap untuk transaksi bulan yang sedang dipilih.
export function updateMonthlyReport(transactions: Transaction[]): Summary {
  return updateSummary(transactions);
}

// Mencari kategori pengeluaran dengan total paling besar pada bulan terpilih.
export function getTopExpenseCategory(transactions: Transaction[]): CategoryReport | null {
  const categoryReport = renderCategoryReport(transactions);

  return categoryReport[0] ?? null;
}

// Mengelompokkan pengeluaran per kategori, lalu mengurutkan dari nominal terbesar.
export function renderCategoryReport(transactions: Transaction[]): CategoryReport[] {
  const reportMap = new Map<string, CategoryReport>();

  transactions
    .filter((transaction) => transaction.jenis === "pengeluaran")
    .forEach((transaction) => {
      const currentReport = reportMap.get(transaction.kategori) ?? {
        kategori: transaction.kategori,
        total: 0,
        jumlahTransaksi: 0
      };

      reportMap.set(transaction.kategori, {
        ...currentReport,
        total: currentReport.total + transaction.nominal,
        jumlahTransaksi: currentReport.jumlahTransaksi + 1
      });
    });

  return [...reportMap.values()].sort((a, b) => b.total - a.total);
}

// Menyiapkan semua data grafik setiap laporan bulanan berubah.
export function updateCharts(transactions: Transaction[]): MonthlyCharts {
  const monthlyReport = updateMonthlyReport(transactions);

  return {
    incomeExpense: renderIncomeExpenseChart(monthlyReport),
    categoryExpenses: renderCategoryExpenseChart(transactions)
  };
}

// Membuat persentase bar untuk perbandingan pemasukan dan pengeluaran.
export function renderIncomeExpenseChart(summary: Summary): IncomeExpenseChartItem[] {
  const biggestTotal = Math.max(summary.totalPemasukan, summary.totalPengeluaran, 0);

  return [
    {
      label: "Pemasukan",
      total: summary.totalPemasukan,
      percentage: getChartPercentage(summary.totalPemasukan, biggestTotal),
      type: "income"
    },
    {
      label: "Pengeluaran",
      total: summary.totalPengeluaran,
      percentage: getChartPercentage(summary.totalPengeluaran, biggestTotal),
      type: "expense"
    }
  ];
}

// Membuat bar horizontal pengeluaran per kategori dari yang terbesar.
export function renderCategoryExpenseChart(transactions: Transaction[]) {
  const categoryReport = renderCategoryReport(transactions);
  const biggestTotal = categoryReport[0]?.total ?? 0;

  return categoryReport.map((category) => ({
    ...category,
    percentage: getChartPercentage(category.total, biggestTotal)
  }));
}

// Menghitung saldo, total pemasukan, total pengeluaran, dan jumlah transaksi.
export function updateSummary(transactions: Transaction[]): Summary {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.jenis === "pemasukan") {
        summary.totalPemasukan += transaction.nominal;
      }

      if (transaction.jenis === "pengeluaran") {
        summary.totalPengeluaran += transaction.nominal;
      }

      summary.saldo = summary.totalPemasukan - summary.totalPengeluaran;
      summary.jumlahTransaksi += 1;

      return summary;
    },
    {
      totalPemasukan: 0,
      totalPengeluaran: 0,
      saldo: 0,
      jumlahTransaksi: 0
    }
  );
}

export function formatRupiah(value: number) {
  return rupiahFormatter.format(value).replace(/\s/g, "");
}

function normalizeTransaction(transaction: Partial<Transaction>): Transaction | null {
  const type = normalizeType(transaction.jenis);
  const amount = Number(transaction.nominal);
  const date = String(transaction.tanggal || "");

  if (!type || !isValidDateValue(date) || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const createdAt = String(transaction.waktuDibuat || "");

  return {
    id: Number(transaction.id) || Date.now(),
    tanggal: date,
    jenis: type,
    kategori: String(transaction.kategori || "Lainnya").trim(),
    nominal: amount,
    keterangan: String(transaction.keterangan || "Tanpa keterangan").trim(),
    waktuDibuat: isValidDateTime(createdAt) ? createdAt : new Date().toISOString()
  };
}

function normalizeType(type: unknown): TransactionType | null {
  if (type === "pemasukan" || type === "pengeluaran") {
    return type;
  }

  return null;
}

function getChartPercentage(value: number, maxValue: number) {
  if (maxValue <= 0 || value <= 0) {
    return 0;
  }

  return Math.round((value / maxValue) * 100);
}

function isValidDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function isValidDateTime(value: string) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}
