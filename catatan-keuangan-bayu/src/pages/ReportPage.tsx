import { useMemo, useState } from "react";
import AppIcon from "../components/AppIcon";
import type { Transaction } from "../types/transaction";
import {
  formatRupiah,
  getSelectedMonthTransactions,
  getTopExpenseCategory,
  renderCategoryReport,
  updateCharts,
  updateMonthlyReport
} from "../utils/transactions";

type ReportPageProps = {
  transactions: Transaction[];
};

const monthFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric"
});

function ReportPage({ transactions }: ReportPageProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);

  const monthlyTransactions = useMemo(
    () => getSelectedMonthTransactions(transactions, selectedMonth),
    [transactions, selectedMonth]
  );
  const monthlyReport = useMemo(() => updateMonthlyReport(monthlyTransactions), [monthlyTransactions]);
  const topExpenseCategory = useMemo(() => getTopExpenseCategory(monthlyTransactions), [monthlyTransactions]);
  const categoryReport = useMemo(() => renderCategoryReport(monthlyTransactions), [monthlyTransactions]);
  const charts = useMemo(() => updateCharts(monthlyTransactions), [monthlyTransactions]);
  const hasMonthlyData = monthlyTransactions.length > 0;
  const monthLabel = formatMonthLabel(selectedMonth);

  return (
    <section className="page-stack">
      <article className="report-card report-hero-card">
        <div>
          <span className="report-eyebrow"><AppIcon name="analytics" size={15} /> Laporan bulan</span>
          <h2>{monthLabel}</h2>
          <p>{hasMonthlyData ? `${monthlyReport.jumlahTransaksi} transaksi tercatat.` : "Belum ada catatan bulan ini."}</p>
        </div>

        <label className="month-picker">
          <span className="field-label"><AppIcon name="calendar" size={15} /> Bulan</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>
      </article>

      <section className="report-summary-grid" aria-label="Ringkasan laporan bulanan">
        <article className="report-summary-card income">
          <span className="metric-label"><AppIcon name="income" size={15} /> Pemasukan</span>
          <strong>{formatRupiah(monthlyReport.totalPemasukan)}</strong>
        </article>
        <article className="report-summary-card expense">
          <span className="metric-label"><AppIcon name="outcome" size={15} /> Pengeluaran</span>
          <strong>{formatRupiah(monthlyReport.totalPengeluaran)}</strong>
        </article>
        <article className={monthlyReport.saldo < 0 ? "report-summary-card balance negative" : "report-summary-card balance"}>
          <span className="metric-label"><AppIcon name="wallet" size={15} /> Saldo</span>
          <strong>{formatRupiah(monthlyReport.saldo)}</strong>
        </article>
        <article className="report-summary-card count">
          <span className="metric-label"><AppIcon name="receipt" size={15} /> Transaksi</span>
          <strong>{monthlyReport.jumlahTransaksi}</strong>
        </article>
      </section>

      {!hasMonthlyData && (
        <article className="empty-panel">
          <span className="empty-icon" aria-hidden="true">
            <AppIcon name="analytics" size={18} />
          </span>
          <div>
            <h3>Belum ada laporan</h3>
            <p>Tambahkan transaksi agar laporan bulan ini mulai terbentuk.</p>
          </div>
        </article>
      )}

      <section className="report-card chart-card">
        <div className="section-heading">
          <div>
            <h2 className="heading-with-icon"><AppIcon name="chart" size={17} /> Grafik</h2>
            <p>Pemasukan dibanding pengeluaran.</p>
          </div>
        </div>

        {hasMonthlyData ? (
          <div className="income-expense-chart">
            {charts.incomeExpense.map((item) => (
              <article className="chart-row" key={item.label}>
                <div className="chart-row-head">
                  <span>{item.label}</span>
                  <strong>{formatRupiah(item.total)}</strong>
                </div>
                <div className="chart-track" aria-label={`${item.label} ${item.percentage}%`}>
                  <span
                    className={`chart-fill ${item.type}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ChartEmptyState />
        )}
      </section>

      <section className="report-card chart-card">
        <div className="section-heading">
          <div>
            <h2 className="heading-with-icon"><AppIcon name="tag" size={17} /> Kategori</h2>
            <p>Pengeluaran terbesar ditaruh paling atas.</p>
          </div>
          <span>{charts.categoryExpenses.length} kategori</span>
        </div>

        {hasMonthlyData ? (
          charts.categoryExpenses.length > 0 ? (
            <div className="category-chart-list">
              {charts.categoryExpenses.map((category) => (
                <article className="category-chart-item" key={category.kategori}>
                  <div className="category-chart-head">
                    <span>{category.kategori}</span>
                    <strong>{formatRupiah(category.total)}</strong>
                  </div>
                  <div className="chart-track" aria-label={`${category.kategori} ${category.percentage}%`}>
                    <span
                      className="chart-fill category"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="report-note">Belum ada pengeluaran bulan ini.</p>
          )
        ) : (
          <ChartEmptyState />
        )}
      </section>

      <article className="report-card top-category-card">
        <div className="section-heading">
          <h2 className="heading-with-icon"><AppIcon name="analytics" size={17} /> Ringkasan</h2>
        </div>

        {topExpenseCategory ? (
          <div className="top-category-content">
            <span>{topExpenseCategory.kategori}</span>
            <strong>{formatRupiah(topExpenseCategory.total)}</strong>
            <p>{topExpenseCategory.jumlahTransaksi} transaksi bulan ini.</p>
          </div>
        ) : (
          <p className="report-note">Belum ada pengeluaran bulan ini.</p>
        )}
      </article>

      <section className="report-card">
        <div className="section-heading">
          <h2 className="heading-with-icon"><AppIcon name="tag" size={17} /> Pengeluaran per kategori</h2>
          <span>{categoryReport.length} kategori</span>
        </div>

        {categoryReport.length > 0 ? (
          <div className="category-report-list">
            {categoryReport.map((category) => (
              <article className="category-report-item" key={category.kategori}>
                <div>
                  <h3>{category.kategori}</h3>
                  <p>{category.jumlahTransaksi} transaksi</p>
                </div>
                <strong>{formatRupiah(category.total)}</strong>
              </article>
            ))}
          </div>
        ) : (
          <article className="empty-panel compact">
            <span className="empty-icon" aria-hidden="true">
              <AppIcon name="tag" size={18} />
            </span>
            <div>
              <h3>Belum ada laporan</h3>
              <p>Tambahkan transaksi agar laporan bulan ini mulai terbentuk.</p>
            </div>
          </article>
        )}
      </section>
    </section>
  );
}

function ChartEmptyState() {
  return (
    <article className="empty-panel compact">
      <span className="empty-icon" aria-hidden="true">
        <AppIcon name="chart" size={18} />
      </span>
      <div>
        <h3>Grafik belum tersedia</h3>
        <p>Data transaksi diperlukan untuk menampilkan grafik.</p>
      </div>
    </article>
  );
}

function getCurrentMonthValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function formatMonthLabel(value: string) {
  if (!value) {
    return "Bulan ini";
  }

  return monthFormatter.format(new Date(`${value}-01T00:00:00`));
}

export default ReportPage;
