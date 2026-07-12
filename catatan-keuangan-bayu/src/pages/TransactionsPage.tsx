import { useEffect, useRef, useState, type FormEvent } from "react";
import AppIcon from "../components/AppIcon";
import TransactionList from "../components/TransactionList";
import type { Category } from "../types/category";
import type { Transaction, TransactionInput, TransactionType } from "../types/transaction";
import { renderTransactionCategoryOptions } from "../utils/categories";

type TransactionsPageProps = {
  editingTransaction: Transaction | null;
  onAddTransaction: (data: TransactionInput) => void;
  onCancelEdit: () => void;
  onClearAllTransactions: () => void;
  onDeleteTransaction: (id: number) => void;
  onEditTransaction: (id: number) => void;
  onUpdateTransaction: (id: number, data: TransactionInput) => void;
  categories: Category[];
  transactions: Transaction[];
};

type FormState = {
  tanggal: string;
  jenis: "" | TransactionType;
  kategori: string;
  nominal: string;
  keterangan: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  tanggal: "",
  jenis: "",
  kategori: "",
  nominal: "",
  keterangan: ""
};

function TransactionsPage({
  editingTransaction,
  onAddTransaction,
  onCancelEdit,
  onClearAllTransactions,
  onDeleteTransaction,
  onEditTransaction,
  onUpdateTransaction,
  categories,
  transactions
}: TransactionsPageProps) {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [formMessage, setFormMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const isEditing = Boolean(editingTransaction);
  const categoryOptions = renderTransactionCategoryOptions(categories, formData.jenis, formData.kategori);
  const isFormReady = Boolean(
    formData.tanggal &&
    formData.jenis &&
    formData.kategori.trim() &&
    Number.isFinite(Number(formData.nominal)) &&
    Number(formData.nominal) > 0
  );

  useEffect(() => {
    if (editingTransaction) {
      setEditMode(editingTransaction);
    }
  }, [editingTransaction]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitLock.current) {
      return;
    }

    const amount = Number(formData.nominal);
    const validationErrors = validateForm(formData, amount);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setMessageType("error");
      setFormMessage("Periksa kembali data yang wajib diisi.");
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);

    const transactionData: TransactionInput = {
      tanggal: formData.tanggal,
      jenis: formData.jenis as TransactionType,
      kategori: formData.kategori.trim(),
      nominal: amount,
      keterangan: formData.keterangan.trim() || "Tanpa keterangan"
    };

    if (editingTransaction) {
      onUpdateTransaction(editingTransaction.id, transactionData);
      resetForm("Transaksi diperbarui.");
      releaseSubmitLock();
      return;
    }

    // Data sudah divalidasi, lalu dikirim ke App agar tersimpan ke localStorage.
    onAddTransaction(transactionData);
    resetForm("Transaksi tersimpan.");
    releaseSubmitLock();
  }

  function updateField(field: keyof FormState, value: string) {
    setFormData((currentData) => {
      const nextData = {
        ...currentData,
        [field]: value
      };

      if (field === "jenis" && currentData.jenis !== value) {
        nextData.kategori = "";
      }

      return nextData;
    });

    if (formMessage) {
      setFormMessage("");
    }
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  }

  function validateField(field: keyof FormState) {
    const error = getFieldError(field, formData, Number(formData.nominal));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: error || undefined }));
  }

  function releaseSubmitLock() {
    window.setTimeout(() => {
      submitLock.current = false;
      setIsSubmitting(false);
    }, 350);
  }

  function resetForm(message = "") {
    setFormData(initialFormState);
    setFieldErrors({});
    setMessageType("success");
    setFormMessage(message);
  }

  function setEditMode(transaction: Transaction) {
    setFormData({
      tanggal: transaction.tanggal,
      jenis: transaction.jenis,
      kategori: transaction.kategori,
      nominal: String(transaction.nominal),
      keterangan: transaction.keterangan
    });
    setFieldErrors({});
    setMessageType("success");
    setFormMessage("Mode edit aktif.");
  }

  function handleCancelEdit() {
    resetForm();
    onCancelEdit();
  }

  return (
    <section className="page-stack">
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="section-heading">
          <div>
            <h2>{isEditing ? "Edit transaksi" : "Catat transaksi"}</h2>
            <p>{isEditing ? "Perbarui data yang dipilih." : "Tulis uang masuk atau keluar."}</p>
          </div>
        </div>

        {isEditing && (
          <div className="edit-indicator" role="status">
            <AppIcon name="pencil" size={15} /> Mode edit aktif. Ubah data lalu tekan Update Transaksi.
          </div>
        )}

        <label>
          <span className="field-label"><AppIcon name="calendar" size={15} /> Tanggal</span>
          <input
            type="date"
            aria-invalid={Boolean(fieldErrors.tanggal)}
            className={fieldErrors.tanggal ? "input-error" : ""}
            value={formData.tanggal}
            onChange={(event) => updateField("tanggal", event.target.value)}
            onBlur={() => validateField("tanggal")}
          />
          {fieldErrors.tanggal && <small className="field-error">{fieldErrors.tanggal}</small>}
        </label>

        <label>
          <span className="field-label"><AppIcon name="swap" size={15} /> Jenis</span>
          <select
            aria-invalid={Boolean(fieldErrors.jenis)}
            className={fieldErrors.jenis ? "input-error" : ""}
            value={formData.jenis}
            onChange={(event) => updateField("jenis", event.target.value)}
            onBlur={() => validateField("jenis")}
          >
            <option value="" disabled>
              Pilih jenis transaksi
            </option>
            <option value="pemasukan">Pemasukan</option>
            <option value="pengeluaran">Pengeluaran</option>
          </select>
          {fieldErrors.jenis && <small className="field-error">{fieldErrors.jenis}</small>}
        </label>

        <label>
          <span className="field-label"><AppIcon name="tag" size={15} /> Kategori</span>
          <select
            disabled={!formData.jenis}
            aria-invalid={Boolean(fieldErrors.kategori)}
            className={fieldErrors.kategori ? "input-error" : ""}
            value={formData.kategori}
            onChange={(event) => updateField("kategori", event.target.value)}
            onBlur={() => validateField("kategori")}
          >
            <option value="" disabled>
              {formData.jenis ? "Pilih kategori" : "Pilih jenis dulu"}
            </option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.nama}>
                {category.ikon} {category.nama}
              </option>
            ))}
          </select>
          {fieldErrors.kategori && <small className="field-error">{fieldErrors.kategori}</small>}
        </label>

        <label>
          <span className="field-label"><AppIcon name="money" size={15} /> Nominal</span>
          <input
            inputMode="numeric"
            placeholder="Contoh: 50000"
            type="number"
            min="1"
            aria-invalid={Boolean(fieldErrors.nominal)}
            className={fieldErrors.nominal ? "input-error" : ""}
            value={formData.nominal}
            onChange={(event) => updateField("nominal", event.target.value)}
            onBlur={() => validateField("nominal")}
          />
          {fieldErrors.nominal && <small className="field-error">{fieldErrors.nominal}</small>}
        </label>

        <label>
          <span className="field-label"><AppIcon name="note" size={15} /> Catatan</span>
          <textarea
            placeholder="Misal: makan siang"
            rows={3}
            value={formData.keterangan}
            onChange={(event) => updateField("keterangan", event.target.value)}
          />
        </label>

        {formMessage && <p className={`form-message ${messageType}`}>{formMessage}</p>}

        <div className="form-actions">
          {isEditing && (
            <button className="secondary-button" type="button" onClick={handleCancelEdit}>
              <AppIcon name="refresh" size={15} /> Batal
            </button>
          )}
          <button type="submit" disabled={!isFormReady || isSubmitting}>
            <AppIcon name={isEditing ? "pencil" : "plus"} size={16} />
            {isSubmitting ? "Menyimpan..." : isEditing ? "Update Transaksi" : "Simpan Transaksi"}
          </button>
        </div>
      </form>

      <section className="transaction-section">
        <div className="section-heading">
          <h2 className="heading-with-icon"><AppIcon name="receipt" size={17} /> Transaksi terakhir</h2>
          <div className="section-actions">
            <span>{transactions.length === 0 ? "Belum ada" : `${transactions.length} item`}</span>
            {transactions.length > 0 && (
              <button className="clear-button" type="button" onClick={onClearAllTransactions}>
                <AppIcon name="trash" size={13} /> Hapus Semua
              </button>
            )}
          </div>
        </div>
        <TransactionList
          onDeleteTransaction={onDeleteTransaction}
          onEditTransaction={onEditTransaction}
          transactions={transactions}
        />
      </section>
    </section>
  );
}

function validateForm(formData: FormState, amount: number): FormErrors {
  return (Object.keys(formData) as Array<keyof FormState>).reduce<FormErrors>((errors, field) => {
    const error = getFieldError(field, formData, amount);
    if (error) {
      errors[field] = error;
    }
    return errors;
  }, {});
}

function getFieldError(field: keyof FormState, formData: FormState, amount: number) {
  if (field === "tanggal" && !formData.tanggal) return "Tanggal wajib diisi.";
  if (field === "jenis" && !formData.jenis) return "Pilih jenis transaksi.";
  if (field === "kategori" && !formData.kategori.trim()) return "Pilih kategori transaksi.";
  if (field === "nominal" && (!formData.nominal || !Number.isFinite(amount) || amount <= 0)) {
    return "Nominal harus lebih dari 0.";
  }
  return "";
}

export default TransactionsPage;
