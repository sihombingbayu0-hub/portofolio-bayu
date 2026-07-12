import AppIcon from "../components/AppIcon";
import TransactionFilter from "../components/TransactionFilter";
import TransactionList from "../components/TransactionList";
import type { Transaction, TransactionFilters } from "../types/transaction";

type HistoryPageProps = {
  categories: string[];
  filters: TransactionFilters;
  filteredTransactions: Transaction[];
  onClearAllTransactions: () => void;
  onDeleteTransaction: (id: number) => void;
  onEditTransaction: (id: number) => void;
  onFilterChange: (field: keyof TransactionFilters, value: string) => void;
  onResetFilters: () => void;
  transactions: Transaction[];
};

function HistoryPage({
  categories,
  filters,
  filteredTransactions,
  onClearAllTransactions,
  onDeleteTransaction,
  onEditTransaction,
  onFilterChange,
  onResetFilters,
  transactions
}: HistoryPageProps) {
  const hasTransactions = transactions.length > 0;
  const hasFilteredResult = filteredTransactions.length > 0;
  const emptyTitle = hasTransactions ? "Transaksi tidak ditemukan" : "Belum ada transaksi";
  const emptyText = hasTransactions
    ? "Coba ubah filter atau kata pencarian."
    : "Catatan uang masuk dan keluarmu akan muncul di sini.";

  return (
    <section className="page-stack">
      <TransactionFilter
        categories={categories}
        filters={filters}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
      />

      <section className="transaction-section">
        <div className="section-heading">
          <h2 className="heading-with-icon"><AppIcon name="history" size={17} /> Riwayat</h2>
          <div className="section-actions">
            <span>{hasTransactions ? `${filteredTransactions.length}/${transactions.length}` : "0 transaksi"}</span>
            {transactions.length > 0 && (
              <button className="clear-button" type="button" onClick={onClearAllTransactions}>
                Hapus Semua
              </button>
            )}
          </div>
        </div>

        <TransactionList
          emptyText={emptyText}
          emptyTitle={emptyTitle}
          onDeleteTransaction={onDeleteTransaction}
          onEditTransaction={onEditTransaction}
          transactions={hasFilteredResult ? filteredTransactions : []}
        />
      </section>
    </section>
  );
}

export default HistoryPage;
