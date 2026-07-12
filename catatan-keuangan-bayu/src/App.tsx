import { useMemo, useState, type ReactElement } from "react";
import Header from "./components/Header";
import BottomNavigation from "./components/BottomNavigation";
import { useFeedback } from "./context/FeedbackContext";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import HistoryPage from "./pages/HistoryPage";
import ReportPage from "./pages/ReportPage";
import SavingsGoalsPage from "./pages/SavingsGoalsPage";
import SettingsPage from "./pages/SettingsPage";
import { navItems, type PageKey } from "./data/navigation";
import type { BackupData } from "./types/backup";
import type { CategoryInput } from "./types/category";
import type { SavingsGoalInput } from "./types/savingsGoal";
import type { Theme } from "./types/theme";
import type { Transaction, TransactionInput } from "./types/transaction";
import { resetAllData } from "./utils/dataBackup";
import { applyTheme, handleThemeChange as normalizeTheme, loadTheme, saveTheme } from "./utils/theme";
import { usePwaInstall } from "./utils/pwa";
import {
  addCategory,
  deleteCategory,
  loadCategories,
  saveCategories,
  updateCategory
} from "./utils/categories";
import {
  addSavingsAmount,
  addSavingsGoal,
  deleteSavingsGoal,
  loadSavingsGoals,
  saveSavingsGoals,
  updateSavingsGoal
} from "./utils/savingsGoals";
import {
  addTransaction,
  clearAllTransactions,
  deleteTransaction,
  editTransaction,
  getFilteredTransactions,
  handleFilterChange,
  loadTransactions,
  renderCategoryFilter,
  resetFilters,
  saveTransactions,
  updateSummary,
  updateTransaction
} from "./utils/transactions";

const pageTitles: Record<PageKey, string> = {
  dashboard: "Beranda",
  transaksi: "Catat",
  riwayat: "Riwayat",
  laporan: "Laporan",
  tabungan: "Target",
  pengaturan: "Atur"
};

function App() {
  const { openConfirmationModal, showToast } = useFeedback();
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [transactions, setTransactions] = useState(loadTransactions);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState(resetFilters);
  const [categories, setCategories] = useState(loadCategories);
  const [savingsGoals, setSavingsGoals] = useState(loadSavingsGoals);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const { canInstall, installApp, isInstalled } = usePwaInstall();

  const activeTitle = useMemo(() => {
    return pageTitles[activePage];
  }, [activePage]);

  const summary = useMemo(() => updateSummary(transactions), [transactions]);
  const filteredTransactions = useMemo(() => getFilteredTransactions(transactions, filters), [transactions, filters]);
  const categoryOptions = useMemo(() => renderCategoryFilter(transactions), [transactions]);

  function handleAddTransaction(data: TransactionInput) {
    setTransactions((currentTransactions) => {
      const updatedTransactions = addTransaction(currentTransactions, data);
      saveTransactions(updatedTransactions);
      return updatedTransactions;
    });
    showToast("Transaksi berhasil ditambahkan.", "success");
  }

  function handleEditTransaction(id: number) {
    const selectedTransaction = editTransaction(transactions, id);

    if (!selectedTransaction) {
      return;
    }

    setEditingTransaction(selectedTransaction);
    setActivePage("transaksi");
  }

  function handleUpdateTransaction(id: number, data: TransactionInput) {
    setTransactions((currentTransactions) => {
      const updatedTransactions = updateTransaction(currentTransactions, id, data);
      saveTransactions(updatedTransactions);
      return updatedTransactions;
    });
    setEditingTransaction(null);
    showToast("Transaksi berhasil diperbarui.", "success");
  }

  function handleCancelEdit() {
    setEditingTransaction(null);
  }

  function handleDeleteTransaction(id: number) {
    openConfirmationModal(
      {
        title: "Hapus transaksi?",
        message: "Transaksi yang sudah dihapus tidak dapat dikembalikan.",
        confirmLabel: "Hapus",
        tone: "danger",
        icon: "trash"
      },
      () => {
        setTransactions((currentTransactions) => {
          const updatedTransactions = deleteTransaction(currentTransactions, id);
          saveTransactions(updatedTransactions);
          return updatedTransactions;
        });

        if (editingTransaction?.id === id) {
          setEditingTransaction(null);
        }
        showToast("Transaksi berhasil dihapus.", "success");
      }
    );
  }

  function handleClearAllTransactions() {
    openConfirmationModal(
      {
        title: "Hapus semua transaksi?",
        message: "Seluruh riwayat transaksi akan dihapus dari perangkat ini.",
        confirmLabel: "Hapus Semua",
        tone: "danger",
        icon: "trash"
      },
      () => {
        setTransactions(clearAllTransactions());
        setEditingTransaction(null);
        showToast("Semua transaksi berhasil dihapus.", "success");
      }
    );
  }

  function handleFiltersChange(field: keyof typeof filters, value: string) {
    setFilters((currentFilters) => handleFilterChange(currentFilters, field, value));
  }

  function handleResetFilters() {
    setFilters(resetFilters());
  }

  function handleThemeChange(value: string) {
    const nextTheme = normalizeTheme(value);
    saveTheme(nextTheme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
    showToast("Tema berhasil diubah.", "success");
  }

  function handleAddCategory(data: CategoryInput) {
    setCategories((currentCategories) => {
      const updatedCategories = addCategory(currentCategories, data);
      saveCategories(updatedCategories);
      return updatedCategories;
    });
    showToast("Kategori berhasil disimpan.", "success");
  }

  function handleUpdateCategory(id: string, data: CategoryInput) {
    setCategories((currentCategories) => {
      const updatedCategories = updateCategory(currentCategories, id, data);
      saveCategories(updatedCategories);
      return updatedCategories;
    });
    showToast("Kategori berhasil diperbarui.", "success");
  }

  function handleDeleteCategory(id: string) {
    const deleteResult = deleteCategory(categories, id, transactions);

    if (deleteResult.error) {
      return deleteResult.error;
    }

    setCategories(deleteResult.categories);
    saveCategories(deleteResult.categories);
    showToast("Kategori berhasil dihapus.", "success");
    return "";
  }

  function handleAddSavingsGoal(data: SavingsGoalInput) {
    setSavingsGoals((currentGoals) => {
      const updatedGoals = addSavingsGoal(currentGoals, data);
      saveSavingsGoals(updatedGoals);
      return updatedGoals;
    });
    showToast("Target tabungan berhasil dibuat.", "success");
  }

  function handleUpdateSavingsGoal(id: number, data: SavingsGoalInput) {
    setSavingsGoals((currentGoals) => {
      const updatedGoals = updateSavingsGoal(currentGoals, id, data);
      saveSavingsGoals(updatedGoals);
      return updatedGoals;
    });
    showToast("Target tabungan berhasil diperbarui.", "success");
  }

  function handleDeleteSavingsGoal(id: number) {
    setSavingsGoals((currentGoals) => {
      const updatedGoals = deleteSavingsGoal(currentGoals, id);
      saveSavingsGoals(updatedGoals);
      return updatedGoals;
    });
    showToast("Target tabungan berhasil dihapus.", "success");
  }

  function handleAddSavingsAmount(id: number, amount: number) {
    setSavingsGoals((currentGoals) => {
      const updatedGoals = addSavingsAmount(currentGoals, id, amount);
      saveSavingsGoals(updatedGoals);
      return updatedGoals;
    });
    showToast("Dana berhasil ditambahkan.", "success");
  }

  function handleImportBackup(data: BackupData) {
    saveTransactions(data.transactions);
    saveCategories(data.categories);
    saveSavingsGoals(data.savingsGoals);

    // Muat ulang dari localStorage agar data melewati normalizer lama.
    setTransactions(loadTransactions());
    setCategories(loadCategories());
    setSavingsGoals(loadSavingsGoals());
    setEditingTransaction(null);
    setFilters(resetFilters());
    showToast("Data berhasil dipulihkan.", "success");
  }

  function handleResetAllData() {
    resetAllData();
    setTransactions(loadTransactions());
    setCategories(loadCategories());
    setSavingsGoals(loadSavingsGoals());
    setEditingTransaction(null);
    setFilters(resetFilters());
    showToast("Semua data berhasil direset.", "success");
  }

  const pageComponents: Record<PageKey, ReactElement> = {
    dashboard: (
      <DashboardPage
        summary={summary}
        transactions={transactions}
        onChangePage={setActivePage}
        onDeleteTransaction={handleDeleteTransaction}
        onEditTransaction={handleEditTransaction}
      />
    ),
    transaksi: (
      <TransactionsPage
        editingTransaction={editingTransaction}
        onAddTransaction={handleAddTransaction}
        onCancelEdit={handleCancelEdit}
        onClearAllTransactions={handleClearAllTransactions}
        onDeleteTransaction={handleDeleteTransaction}
        onEditTransaction={handleEditTransaction}
        onUpdateTransaction={handleUpdateTransaction}
        categories={categories}
        transactions={transactions}
      />
    ),
    riwayat: (
      <HistoryPage
        categories={categoryOptions}
        filteredTransactions={filteredTransactions}
        filters={filters}
        onClearAllTransactions={handleClearAllTransactions}
        onDeleteTransaction={handleDeleteTransaction}
        onEditTransaction={handleEditTransaction}
        onFilterChange={handleFiltersChange}
        onResetFilters={handleResetFilters}
        transactions={transactions}
      />
    ),
    laporan: <ReportPage transactions={transactions} />,
    tabungan: (
      <SavingsGoalsPage
        goals={savingsGoals}
        onAddAmount={handleAddSavingsAmount}
        onAddGoal={handleAddSavingsGoal}
        onDeleteGoal={handleDeleteSavingsGoal}
        onUpdateGoal={handleUpdateSavingsGoal}
      />
    ),
    pengaturan: (
      <SettingsPage
        categories={categories}
        savingsGoals={savingsGoals}
        transactions={transactions}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onImportBackup={handleImportBackup}
        onResetAllData={handleResetAllData}
        onThemeChange={handleThemeChange}
        onUpdateCategory={handleUpdateCategory}
        canInstall={canInstall}
        isInstalled={isInstalled}
        onInstallApp={installApp}
        theme={theme}
      />
    )
  };

  return (
    <div className="app-shell">
      <Header activeTitle={activeTitle} />

      <main className="app-main" aria-live="polite">
        {pageComponents[activePage]}
      </main>

      <BottomNavigation
        items={navItems}
        activePage={activePage}
        onChangePage={setActivePage}
      />
    </div>
  );
}

export default App;
