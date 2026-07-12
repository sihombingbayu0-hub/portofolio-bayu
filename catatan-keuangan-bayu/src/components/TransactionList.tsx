import AppIcon from "./AppIcon";
import type { Transaction } from "../types/transaction";
import { formatRupiah, renderTransactions } from "../utils/transactions";

type TransactionListProps = {
  transactions: Transaction[];
  emptyTitle?: string;
  emptyText?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onDeleteTransaction?: (id: number) => void;
  onEditTransaction?: (id: number) => void;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

function TransactionList({
  transactions,
  emptyTitle = "Belum ada transaksi",
  emptyText = "Catatan uang masuk dan keluarmu akan muncul di sini.",
  emptyActionLabel,
  onEmptyAction,
  onDeleteTransaction,
  onEditTransaction
}: TransactionListProps) {
  const sortedTransactions = renderTransactions(transactions);

  if (sortedTransactions.length === 0) {
    return (
      <article className="empty-panel">
        <span className="empty-icon" aria-hidden="true">
          <AppIcon name="receipt" size={18} />
        </span>
        <div>
          <h3>{emptyTitle}</h3>
          <p>{emptyText}</p>
        </div>
        {emptyActionLabel && onEmptyAction && (
          <button className="empty-action" type="button" onClick={onEmptyAction}>
            <AppIcon name="plus" size={15} /> {emptyActionLabel}
          </button>
        )}
      </article>
    );
  }

  return (
    <div className="transaction-list">
      {sortedTransactions.map((transaction) => {
        const isIncome = transaction.jenis === "pemasukan";
        const sign = isIncome ? "+" : "-";

        return (
          <article className="transaction-item" key={transaction.id}>
            <div className={isIncome ? "transaction-mark income" : "transaction-mark expense"}>
              <AppIcon name={isIncome ? "income" : "outcome"} size={17} />
            </div>
            <div className="transaction-detail">
              <div className="transaction-title-row">
                <h3>{transaction.keterangan}</h3>
                <span className="category-badge">{transaction.kategori}</span>
              </div>
              <p>{formatDate(transaction.tanggal)}</p>
            </div>
            <div className="transaction-side">
              <strong className={isIncome ? "transaction-amount income" : "transaction-amount expense"}>
                {sign}
                {formatRupiah(transaction.nominal)}
              </strong>

              {(onEditTransaction || onDeleteTransaction) && (
                <div className="transaction-actions">
                  {onEditTransaction && (
                    <button type="button" onClick={() => onEditTransaction(transaction.id)}>
                      <AppIcon name="pencil" size={13} /><span>Edit</span>
                    </button>
                  )}
                  {onDeleteTransaction && (
                    <button className="danger" type="button" onClick={() => onDeleteTransaction(transaction.id)}>
                      <AppIcon name="trash" size={13} /><span>Hapus</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? "Tanggal tidak valid" : dateFormatter.format(date);
}

export default TransactionList;
