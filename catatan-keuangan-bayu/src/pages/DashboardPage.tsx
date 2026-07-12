import AppIcon, { type IconName } from "../components/AppIcon";
import TransactionList from "../components/TransactionList";
import type { PageKey } from "../data/navigation";
import type { Summary, Transaction } from "../types/transaction";
import { formatRupiah } from "../utils/transactions";

type DashboardPageProps = {
  summary: Summary;
  transactions: Transaction[];
  onChangePage: (page: PageKey) => void;
  onDeleteTransaction: (id: number) => void;
  onEditTransaction: (id: number) => void;
};

function DashboardPage({
  summary,
  transactions,
  onChangePage,
  onDeleteTransaction,
  onEditTransaction
}: DashboardPageProps) {
  const quickActions: Array<{ label: string; icon: IconName; page: PageKey }> = [
    { label: "Masuk", icon: "income", page: "transaksi" },
    { label: "Keluar", icon: "outcome", page: "transaksi" },
    { label: "Riwayat", icon: "history", page: "riwayat" },
    { label: "Laporan", icon: "chart", page: "laporan" }
  ];

  return (
    <section className="page-stack">
      <article className="balance-card">
        <div className="balance-content">
          <div className="balance-top">
            <span className="metric-label"><AppIcon name="wallet" size={15} /> Saldo saat ini</span>
            <b>IDR</b>
          </div>
          <strong>{formatRupiah(summary.saldo)}</strong>
          <p>{summary.jumlahTransaksi === 0 ? "Belum ada transaksi" : `${summary.jumlahTransaksi} transaksi tersimpan`}</p>
        </div>
        <div className="balance-chip">Uang Ku Ni</div>
      </article>

      <section className="quick-actions" aria-label="Aksi cepat">
        {quickActions.map((action) => (
          <button className="quick-action" key={action.label} type="button" onClick={() => onChangePage(action.page)}>
            <span className="icon-circle icon-menu" aria-hidden="true"><AppIcon name={action.icon} size={19} /></span>
            <span className="icon-label">{action.label}</span>
          </button>
        ))}
      </section>

      <div className="summary-grid">
        <article className="summary-card income">
          <span className="metric-label"><AppIcon name="income" size={15} /> Pemasukan</span>
          <strong>{formatRupiah(summary.totalPemasukan)}</strong>
        </article>
        <article className="summary-card expense">
          <span className="metric-label"><AppIcon name="outcome" size={15} /> Pengeluaran</span>
          <strong>{formatRupiah(summary.totalPengeluaran)}</strong>
        </article>
      </div>

      <button className="savings-shortcut" type="button" onClick={() => onChangePage("tabungan")}>
        <span className="savings-shortcut-icon" aria-hidden="true"><AppIcon name="target" size={19} /></span>
        <span className="savings-shortcut-copy">
          <strong>Target tabungan</strong>
          <small>Buat dan pantau tujuanmu</small>
        </span>
        <b aria-hidden="true"><AppIcon name="chevron-right" size={15} /></b>
      </button>

      <section className="transaction-section">
        <div className="section-heading">
          <h2 className="heading-with-icon"><AppIcon name="receipt" size={17} /> Transaksi terakhir</h2>
          <span>{summary.jumlahTransaksi} item</span>
        </div>

        <TransactionList
          emptyActionLabel="Catat Sekarang"
          onEmptyAction={() => onChangePage("transaksi")}
          onDeleteTransaction={onDeleteTransaction}
          onEditTransaction={onEditTransaction}
          transactions={transactions.slice(0, 3)}
        />
      </section>
    </section>
  );
}

export default DashboardPage;
