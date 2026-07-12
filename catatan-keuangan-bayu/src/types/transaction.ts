export type TransactionType = "pemasukan" | "pengeluaran";

export type TransactionFilterType = "semua" | TransactionType;

export type Transaction = {
  id: number;
  tanggal: string;
  jenis: TransactionType;
  kategori: string;
  nominal: number;
  keterangan: string;
  waktuDibuat: string;
};

export type TransactionInput = {
  tanggal: string;
  jenis: TransactionType;
  kategori: string;
  nominal: number;
  keterangan: string;
};

export type TransactionFilters = {
  jenis: TransactionFilterType;
  kategori: string;
  bulan: string;
  keyword: string;
};

export type CategoryReport = {
  kategori: string;
  total: number;
  jumlahTransaksi: number;
};

export type IncomeExpenseChartItem = {
  label: "Pemasukan" | "Pengeluaran";
  total: number;
  percentage: number;
  type: "income" | "expense";
};

export type CategoryExpenseChartItem = CategoryReport & {
  percentage: number;
};

export type MonthlyCharts = {
  incomeExpense: IncomeExpenseChartItem[];
  categoryExpenses: CategoryExpenseChartItem[];
};

export type Summary = {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
  jumlahTransaksi: number;
};
