import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import AppIcon, { type IconName } from "../components/AppIcon";
import { useFeedback } from "../context/FeedbackContext";
import type { BackupData, DataMessage } from "../types/backup";
import type { Category, CategoryInput } from "../types/category";
import type { SavingsGoal } from "../types/savingsGoal";
import type { Theme } from "../types/theme";
import type { Transaction } from "../types/transaction";
import type { TransactionType } from "../types/transaction";
import { editCategory, renderCategories } from "../utils/categories";
import {
  exportBackupJSON,
  exportTransactionsCSV,
  importBackupJSON,
  showDataMessage
} from "../utils/dataBackup";

type SettingsPageProps = {
  canInstall: boolean;
  categories: Category[];
  savingsGoals: SavingsGoal[];
  transactions: Transaction[];
  onAddCategory: (data: CategoryInput) => void;
  onDeleteCategory: (id: string) => string;
  onImportBackup: (data: BackupData) => void;
  onInstallApp: () => Promise<void>;
  onResetAllData: () => void;
  onThemeChange: (theme: Theme) => void;
  onUpdateCategory: (id: string, data: CategoryInput) => void;
  isInstalled: boolean;
  theme: Theme;
};

type CategoryFormState = {
  nama: string;
  jenis: TransactionType;
  ikon: string;
  warna: string;
};

const initialCategoryForm: CategoryFormState = {
  nama: "",
  jenis: "pengeluaran",
  ikon: "⭐",
  warna: "#D3A474"
};

const iconOptions = ["💰", "💸", "💼", "💻", "🎁", "🍜", "🚌", "📱", "🛍️", "☕", "🎓", "🧾", "⭐"];

const themeOptions: Array<{ value: Theme; label: string; description: string; icon: IconName }> = [
  { value: "default", label: "Default", description: "Hijau & cream", icon: "palette" },
  { value: "light", label: "Terang", description: "Lebih cerah", icon: "sun" },
  { value: "dark", label: "Gelap", description: "Lebih redup", icon: "moon" }
];

function SettingsPage({
  canInstall,
  categories,
  savingsGoals,
  transactions,
  onAddCategory,
  onDeleteCategory,
  onImportBackup,
  onInstallApp,
  onResetAllData,
  onThemeChange,
  onUpdateCategory,
  isInstalled,
  theme
}: SettingsPageProps) {
  const { openConfirmationModal, showToast } = useFeedback();
  const [formData, setFormData] = useState<CategoryFormState>(initialCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("success");
  const [dataMessage, setDataMessage] = useState<DataMessage | null>(null);
  const [isProcessing, setIsProcessing] = useState<"backup" | "csv" | "import" | "reset" | null>(null);
  const categoryGroups = useMemo(() => renderCategories(categories), [categories]);
  const customCategoryCount = useMemo(
    () => categories.filter((category) => !/^(income|expense)-/.test(category.id)).length,
    [categories]
  );
  const isEditing = Boolean(editingCategoryId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.nama.trim()) {
      showMessage("Nama kategori wajib diisi.", "error");
      return;
    }

    const categoryData: CategoryInput = {
      nama: formData.nama,
      jenis: formData.jenis,
      ikon: formData.ikon,
      warna: formData.warna
    };

    if (editingCategoryId) {
      onUpdateCategory(editingCategoryId, categoryData);
      resetForm("Kategori diperbarui.");
      return;
    }

    onAddCategory(categoryData);
    resetForm("Kategori baru tersimpan.");
  }

  function updateField(field: keyof CategoryFormState, value: string) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value
    }));

    if (formMessage) {
      setFormMessage("");
    }
  }

  function handleEditCategory(id: string) {
    const selectedCategory = editCategory(categories, id);

    if (!selectedCategory) {
      showMessage("Kategori tidak ditemukan.", "error");
      return;
    }

    setEditingCategoryId(selectedCategory.id);
    setFormData({
      nama: selectedCategory.nama,
      jenis: selectedCategory.jenis,
      ikon: selectedCategory.ikon,
      warna: selectedCategory.warna || "#D3A474"
    });
    showMessage("Mode edit kategori aktif.", "success");
  }

  function handleDeleteCategory(id: string) {
    openConfirmationModal(
      {
        title: "Hapus kategori?",
        message: "Kategori hanya dapat dihapus jika belum digunakan oleh transaksi.",
        confirmLabel: "Hapus",
        tone: "danger",
        icon: "trash"
      },
      () => {
        const errorMessage = onDeleteCategory(id);

        if (errorMessage) {
          showMessage(errorMessage, "error");
          showToast(errorMessage, "warning");
          return;
        }

        if (editingCategoryId === id) {
          resetForm("Kategori dihapus.");
          return;
        }

        showMessage("Kategori dihapus.", "success");
      }
    );
  }

  function resetForm(message = "") {
    setFormData(initialCategoryForm);
    setEditingCategoryId("");
    showMessage(message, "success");
  }

  function showMessage(message: string, type: "error" | "success") {
    setMessageType(type);
    setFormMessage(message);
  }

  async function handleBackup() {
    setIsProcessing("backup");
    await waitForPaint();
    try {
      exportBackupJSON(transactions, categories, savingsGoals);
      setDataMessage(showDataMessage("Backup berhasil dibuat.", "success"));
      showToast("Backup berhasil dibuat.", "success");
    } finally {
      setIsProcessing(null);
    }
  }

  async function handleExportCsv() {
    setIsProcessing("csv");
    await waitForPaint();
    try {
      exportTransactionsCSV(transactions);
      setDataMessage(showDataMessage("Export CSV berhasil dibuat.", "success"));
      showToast("Export CSV berhasil dibuat.", "success");
    } finally {
      setIsProcessing(null);
    }
  }

  async function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsProcessing("import");
    const result = await importBackupJSON(file);
    setIsProcessing(null);

    if (!result.valid || !result.data) {
      setDataMessage(showDataMessage(result.message, "error"));
      showToast("File backup tidak valid.", "error");
      return;
    }

    openConfirmationModal(
      {
        title: "Pulihkan data backup?",
        message: "Data saat ini akan diganti dengan isi file backup yang dipilih.",
        confirmLabel: "Pulihkan Data",
        tone: "primary",
        icon: "download"
      },
      async () => {
        setIsProcessing("import");
        await waitForPaint();
        onImportBackup(result.data as BackupData);
        setDataMessage(showDataMessage("Data berhasil dipulihkan.", "success"));
        setIsProcessing(null);
      }
    );
  }

  function handleResetAllData() {
    openConfirmationModal(
      {
        title: "Reset semua data?",
        message: "Transaksi, kategori custom, dan target tabungan akan dihapus dari perangkat.",
        confirmLabel: "Reset Data",
        tone: "danger",
        icon: "warning"
      },
      async () => {
        setIsProcessing("reset");
        await waitForPaint();
        onResetAllData();
        setDataMessage(showDataMessage("Semua data berhasil direset.", "success"));
        setIsProcessing(null);
      }
    );
  }

  return (
    <section className="page-stack">
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="section-heading">
          <div>
            <h2 className="heading-with-icon"><AppIcon name={isEditing ? "pencil" : "plus"} size={17} />{isEditing ? "Edit kategori" : "Kategori baru"}</h2>
            <p>Atur kategori biar catatan lebih rapi.</p>
          </div>
        </div>

        <label>
          <span className="field-label"><AppIcon name="tag" size={15} /> Nama kategori</span>
          <input
            placeholder="Contoh: Laundry"
            type="text"
            value={formData.nama}
            onChange={(event) => updateField("nama", event.target.value)}
          />
        </label>

        <label>
          <span className="field-label"><AppIcon name="swap" size={15} /> Jenis kategori</span>
          <select
            value={formData.jenis}
            onChange={(event) => updateField("jenis", event.target.value as TransactionType)}
          >
            <option value="pemasukan">Pemasukan</option>
            <option value="pengeluaran">Pengeluaran</option>
          </select>
        </label>

        <div className="category-form-row">
          <label>
            <span className="field-label"><AppIcon name="palette" size={15} /> Ikon</span>
            <select value={formData.ikon} onChange={(event) => updateField("ikon", event.target.value)}>
              {iconOptions.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="field-label"><AppIcon name="palette" size={15} /> Warna</span>
            <input
              type="color"
              value={formData.warna}
              onChange={(event) => updateField("warna", event.target.value)}
            />
          </label>
        </div>

        {formMessage && <p className={`form-message ${messageType}`}>{formMessage}</p>}

        <div className="form-actions">
          {isEditing && (
            <button className="secondary-button" type="button" onClick={() => resetForm()}>
              <AppIcon name="refresh" size={15} /> Batal
            </button>
          )}
          <button type="submit" disabled={!formData.nama.trim()}><AppIcon name={isEditing ? "pencil" : "plus"} size={16} />{isEditing ? "Update Kategori" : "Simpan Kategori"}</button>
        </div>
      </form>

      <section className="theme-card">
        <div className="section-heading">
          <div>
            <h2 className="heading-with-icon"><AppIcon name="palette" size={17} /> Tema aplikasi</h2>
            <p>Pilih tampilan yang paling nyaman buatmu.</p>
          </div>
        </div>

        <div className="theme-options" role="radiogroup" aria-label="Pilihan tema aplikasi">
          {themeOptions.map((option) => (
            <label className={theme === option.value ? "theme-option active" : "theme-option"} key={option.value}>
              <input
                checked={theme === option.value}
                name="app-theme"
                type="radio"
                value={option.value}
                onChange={(event) => onThemeChange(event.target.value as Theme)}
              />
              <span className={`theme-swatch ${option.value}`} aria-hidden="true" />
              <span className="theme-icon icon-circle icon-soft" aria-hidden="true"><AppIcon name={option.icon} size={16} /></span>
              <span className="theme-option-copy">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="install-card">
        <div className="install-card-icon" aria-hidden="true"><AppIcon name="smartphone" size={20} /></div>
        <div className="install-card-copy">
          <h2>Pasang di HP</h2>
          <p>
            {isInstalled
              ? "Uang Ku Ni sudah terpasang di perangkat ini."
              : "Buka catatan keuanganmu langsung dari layar utama."}
          </p>
        </div>
        {canInstall ? (
          <button className="install-button" type="button" onClick={onInstallApp}>
            <AppIcon name="download" size={17} /> <span>Install Aplikasi</span>
          </button>
        ) : !isInstalled ? (
          <p className="install-help">Buka menu browser lalu pilih Tambahkan ke layar utama.</p>
        ) : null}
      </section>

      <section className="data-card">
        <div className="section-heading">
          <div>
            <h2 className="heading-with-icon"><AppIcon name="database" size={17} /> Backup &amp; Data</h2>
            <p>Simpan atau pindahkan catatanmu dengan aman.</p>
          </div>
        </div>

        <div className="data-action-grid">
          <button type="button" disabled={isProcessing !== null} onClick={handleBackup}>
            <AppIcon name="database" size={18} /><span>{isProcessing === "backup" ? "Memproses..." : "Backup"}</span>
          </button>
          <label className={isProcessing ? "data-upload-button disabled" : "data-upload-button"}>
            <AppIcon name="download" size={18} /><span>{isProcessing === "import" ? "Memproses..." : "Import"}</span>
            <input
              accept=".json,application/json"
              disabled={isProcessing !== null}
              type="file"
              onChange={handleImportChange}
            />
          </label>
          <button type="button" disabled={isProcessing !== null} onClick={handleExportCsv}>
            <AppIcon name="file" size={18} /><span>{isProcessing === "csv" ? "Memproses..." : "Export"}</span>
          </button>
          <button className="danger data-reset-button" type="button" disabled={isProcessing !== null} onClick={handleResetAllData}>
            <AppIcon name="refresh" size={18} /><span>{isProcessing === "reset" ? "Memproses..." : "Reset"}</span>
          </button>
        </div>

        {dataMessage && <p className={`data-message ${dataMessage.type}`}>{dataMessage.text}</p>}
        <p className="data-note">Backup JSON berisi transaksi, kategori, dan target tabungan.</p>
      </section>

      {customCategoryCount === 0 && (
        <article className="empty-panel category-empty-state">
          <span className="empty-icon" aria-hidden="true"><AppIcon name="tag" size={18} /></span>
          <div>
            <h3>Belum ada kategori tambahan</h3>
            <p>Kategori buatanmu akan muncul di sini.</p>
          </div>
        </article>
      )}

      <CategorySection
        title="Kategori pemasukan"
        categories={categoryGroups.pemasukan}
        onDeleteCategory={handleDeleteCategory}
        onEditCategory={handleEditCategory}
      />

      <CategorySection
        title="Kategori pengeluaran"
        categories={categoryGroups.pengeluaran}
        onDeleteCategory={handleDeleteCategory}
        onEditCategory={handleEditCategory}
      />

      <section className="about-card">
        <div className="about-brand">
          <span className="about-logo" aria-hidden="true">
            <img className="brand-logo-image" src="./brand-logo.png" alt="" />
          </span>
          <div>
            <span className="about-kicker">Tentang Aplikasi</span>
            <h2>Uang Ku Ni</h2>
            <p>Versi 1.0.0</p>
          </div>
        </div>

        <p className="about-description">
          Aplikasi pencatat keuangan pribadi untuk membantu mencatat pemasukan, pengeluaran, saldo,
          laporan, dan target tabungan langsung dari HP.
        </p>

        <dl className="about-details">
          <div><dt>Dibuat oleh</dt><dd>Bayu Aditya Sihombing</dd></div>
          <div><dt>Teknologi</dt><dd>HTML, CSS, TypeScript/JavaScript, localStorage, dan PWA</dd></div>
          <div><dt>Status data</dt><dd>Data tersimpan secara lokal di perangkat.</dd></div>
        </dl>

        <details className="about-guide">
          <summary><AppIcon name="info" size={17} /> Panduan Penggunaan</summary>
          <ol>
            <li>Tambahkan pemasukan atau pengeluaran.</li>
            <li>Pilih kategori transaksi.</li>
            <li>Pantau saldo pada halaman Beranda.</li>
            <li>Lihat laporan berdasarkan bulan.</li>
            <li>Buat target tabungan.</li>
            <li>Gunakan Backup Data agar catatan lebih aman.</li>
            <li>Install aplikasi ke layar utama HP.</li>
          </ol>
        </details>

        <div className="about-actions">
          <button type="button" disabled={!canInstall || isInstalled} onClick={onInstallApp}>
            <AppIcon name={isInstalled ? "check" : "smartphone"} size={17} />
            <span>{isInstalled ? "Sudah Terpasang" : "Install Aplikasi"}</span>
          </button>
          <button type="button" disabled={isProcessing !== null} onClick={handleBackup}>
            <AppIcon name="database" size={17} /><span>Backup Data</span>
          </button>
        </div>
      </section>
    </section>
  );
}

type CategorySectionProps = {
  title: string;
  categories: Category[];
  onDeleteCategory: (id: string) => void;
  onEditCategory: (id: string) => void;
};

function CategorySection({
  title,
  categories,
  onDeleteCategory,
  onEditCategory
}: CategorySectionProps) {
  return (
    <section className="category-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span>{categories.length} item</span>
      </div>

      <div className="custom-category-list">
        {categories.map((category) => (
          <article className="custom-category-item" key={category.id}>
            <span className="custom-category-icon" style={{ backgroundColor: category.warna }}>
              {category.ikon}
            </span>
            <div>
              <h3>{category.nama}</h3>
              <p>{category.jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"}</p>
            </div>
            <div className="custom-category-actions">
              <button type="button" onClick={() => onEditCategory(category.id)}>
                <AppIcon name="pencil" size={13} /><span>Edit</span>
              </button>
              <button className="danger" type="button" onClick={() => onDeleteCategory(category.id)}>
                <AppIcon name="trash" size={13} /><span>Hapus</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SettingsPage;

function waitForPaint() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}
