import { useMemo, useState, type FormEvent } from "react";
import AppIcon from "../components/AppIcon";
import { useFeedback } from "../context/FeedbackContext";
import type { SavingsFormState, SavingsGoal, SavingsGoalInput } from "../types/savingsGoal";
import {
  calculateSavingsProgress,
  editSavingsGoal,
  renderSavingsGoals,
  resetSavingsForm
} from "../utils/savingsGoals";
import { formatRupiah } from "../utils/transactions";

type SavingsGoalsPageProps = {
  goals: SavingsGoal[];
  onAddAmount: (id: number, amount: number) => void;
  onAddGoal: (data: SavingsGoalInput) => void;
  onDeleteGoal: (id: number) => void;
  onUpdateGoal: (id: number, data: SavingsGoalInput) => void;
};

type GoalMessage = {
  id: number;
  text: string;
  type: "error" | "success";
};

function SavingsGoalsPage({
  goals,
  onAddAmount,
  onAddGoal,
  onDeleteGoal,
  onUpdateGoal
}: SavingsGoalsPageProps) {
  const { openConfirmationModal } = useFeedback();
  const [formData, setFormData] = useState<SavingsFormState>(resetSavingsForm);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [formMessage, setFormMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("success");
  const [fundingGoalId, setFundingGoalId] = useState<number | null>(null);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [goalMessage, setGoalMessage] = useState<GoalMessage | null>(null);
  const orderedGoals = useMemo(() => renderSavingsGoals(goals), [goals]);
  const isEditing = editingGoalId !== null;
  const currentTargetAmount = Number(formData.nominalTarget);
  const currentCollectedAmount = formData.nominalTerkumpul ? Number(formData.nominalTerkumpul) : 0;
  const isSavingsFormReady = Boolean(
    formData.namaTarget.trim() &&
    Number.isFinite(currentTargetAmount) &&
    currentTargetAmount > 0 &&
    Number.isFinite(currentCollectedAmount) &&
    currentCollectedAmount >= 0 &&
    currentCollectedAmount <= currentTargetAmount
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetAmount = Number(formData.nominalTarget);
    const collectedAmount = formData.nominalTerkumpul.trim()
      ? Number(formData.nominalTerkumpul)
      : 0;
    const validationMessage = validateSavingsForm(formData, targetAmount, collectedAmount);

    if (validationMessage) {
      showFormMessage(validationMessage, "error");
      return;
    }

    const goalData: SavingsGoalInput = {
      namaTarget: formData.namaTarget,
      nominalTarget: targetAmount,
      nominalTerkumpul: collectedAmount,
      deadline: formData.deadline || undefined,
      catatan: formData.catatan.trim() || "Tanpa catatan"
    };

    if (editingGoalId !== null) {
      onUpdateGoal(editingGoalId, goalData);
      clearSavingsForm("Target berhasil diperbarui.");
      return;
    }

    onAddGoal(goalData);
    clearSavingsForm("Target baru berhasil dibuat.");
  }

  function updateField(field: keyof SavingsFormState, value: string) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value
    }));

    if (formMessage) {
      setFormMessage("");
    }
  }

  function handleEditGoal(id: number) {
    const selectedGoal = editSavingsGoal(goals, id);

    if (!selectedGoal) {
      showFormMessage("Target tidak ditemukan.", "error");
      return;
    }

    setEditingGoalId(id);
    setFormData({
      namaTarget: selectedGoal.namaTarget,
      nominalTarget: String(selectedGoal.nominalTarget),
      nominalTerkumpul: String(selectedGoal.nominalTerkumpul),
      deadline: selectedGoal.deadline || "",
      catatan: selectedGoal.catatan === "Tanpa catatan" ? "" : selectedGoal.catatan
    });
    setFundingGoalId(null);
    setGoalMessage(null);
    showFormMessage("Mode edit target aktif.", "success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDeleteGoal(id: number) {
    openConfirmationModal(
      {
        title: "Hapus target tabungan?",
        message: "Target dan progress yang sudah dicatat tidak dapat dikembalikan.",
        confirmLabel: "Hapus",
        tone: "danger",
        icon: "trash"
      },
      () => {
        onDeleteGoal(id);

        if (editingGoalId === id) {
          clearSavingsForm("Target berhasil dihapus.");
        } else {
          showFormMessage("Target berhasil dihapus.", "success");
        }

        if (fundingGoalId === id) {
          closeFundingForm();
        }
      }
    );
  }

  function openFundingForm(id: number) {
    setFundingGoalId(id);
    setAdditionalAmount("");
    setGoalMessage(null);
  }

  function closeFundingForm() {
    setFundingGoalId(null);
    setAdditionalAmount("");
  }

  function handleAddAmount(goal: SavingsGoal) {
    const amount = Number(additionalAmount);
    const remainingAmount = goal.nominalTarget - goal.nominalTerkumpul;

    if (!Number.isFinite(amount) || amount <= 0) {
      setGoalMessage({ id: goal.id, text: "Nominal tambahan harus lebih dari 0.", type: "error" });
      return;
    }

    if (amount > remainingAmount) {
      setGoalMessage({ id: goal.id, text: "Nominal melebihi sisa target.", type: "error" });
      return;
    }

    onAddAmount(goal.id, amount);
    closeFundingForm();
    setGoalMessage({ id: goal.id, text: "Dana berhasil ditambahkan.", type: "success" });
  }

  function clearSavingsForm(message = "") {
    setFormData(resetSavingsForm());
    setEditingGoalId(null);
    showFormMessage(message, "success");
  }

  function showFormMessage(message: string, type: "error" | "success") {
    setMessageType(type);
    setFormMessage(message);
  }

  return (
    <section className="page-stack savings-page">
      <form className="form-card savings-form" onSubmit={handleSubmit}>
        <div className="section-heading">
          <div>
            <h2 className="heading-with-icon"><AppIcon name={isEditing ? "pencil" : "target"} size={17} />{isEditing ? "Edit target" : "Buat target tabungan"}</h2>
            <p>Tentukan tujuan dan mulai isi sedikit demi sedikit.</p>
          </div>
        </div>

        <label>
          <span className="field-label"><AppIcon name="target" size={15} /> Nama target</span>
          <input
            placeholder="Contoh: Beli laptop"
            type="text"
            value={formData.namaTarget}
            onChange={(event) => updateField("namaTarget", event.target.value)}
          />
        </label>

        <div className="savings-amount-grid">
          <label>
            <span className="field-label"><AppIcon name="money" size={15} /> Nominal target</span>
            <input
              inputMode="numeric"
              min="1"
              placeholder="Contoh: 10000000"
              type="number"
              value={formData.nominalTarget}
              onChange={(event) => updateField("nominalTarget", event.target.value)}
            />
          </label>

          <label>
            <span className="field-label"><AppIcon name="coins" size={15} /> Terkumpul awal</span>
            <input
              inputMode="numeric"
              min="0"
              placeholder="0"
              type="number"
              value={formData.nominalTerkumpul}
              onChange={(event) => updateField("nominalTerkumpul", event.target.value)}
            />
          </label>
        </div>

        <label>
          <span className="field-label">
            <AppIcon name="calendar" size={15} /> Deadline <small className="optional-label">Opsional</small>
          </span>
          <input
            type="date"
            value={formData.deadline}
            onChange={(event) => updateField("deadline", event.target.value)}
          />
        </label>

        <label>
          <span className="field-label">
            <AppIcon name="note" size={15} /> Catatan <small className="optional-label">Opsional</small>
          </span>
          <textarea
            placeholder="Contoh: Sisihkan uang freelance"
            rows={3}
            value={formData.catatan}
            onChange={(event) => updateField("catatan", event.target.value)}
          />
        </label>

        {formMessage && <p className={`form-message ${messageType}`}>{formMessage}</p>}

        <div className="form-actions">
          {isEditing && (
            <button className="secondary-button" type="button" onClick={() => clearSavingsForm()}>
              <AppIcon name="refresh" size={15} /> Batal
            </button>
          )}
          <button type="submit" disabled={!isSavingsFormReady}><AppIcon name={isEditing ? "pencil" : "plus"} size={16} />{isEditing ? "Update Target" : "Simpan Target"}</button>
        </div>
      </form>

      <section className="savings-list-section">
        <div className="section-heading savings-list-heading">
          <div>
            <h2 className="heading-with-icon"><AppIcon name="target" size={17} /> Target tabungan</h2>
            <p>{orderedGoals.length === 0 ? "Belum ada target aktif." : `${orderedGoals.length} target tersimpan.`}</p>
          </div>
          <span>{orderedGoals.length} item</span>
        </div>

        {orderedGoals.length === 0 ? (
          <div className="empty-panel compact">
            <span className="empty-icon" aria-hidden="true"><AppIcon name="target" size={18} /></span>
            <div>
              <h3>Belum ada target</h3>
              <p>Buat target agar kegiatan menabung lebih terarah.</p>
            </div>
          </div>
        ) : (
          <div className="savings-goal-list">
            {orderedGoals.map((goal) => {
              const progress = calculateSavingsProgress(goal);
              const remainingAmount = Math.max(0, goal.nominalTarget - goal.nominalTerkumpul);
              const isReached = progress >= 100;
              const isFunding = fundingGoalId === goal.id;
              const currentGoalMessage = goalMessage?.id === goal.id ? goalMessage : null;

              return (
                <article className={isReached ? "savings-goal-card reached" : "savings-goal-card"} key={goal.id}>
                  <div className="savings-goal-head">
                    <div>
                      <span className="savings-goal-kicker">Target tabungan</span>
                      <h3>{goal.namaTarget}</h3>
                    </div>
                    {isReached && <span className="goal-status"><AppIcon name="check" size={13} /> Tercapai</span>}
                  </div>

                  <div className="savings-value-row">
                    <div>
                      <span>Terkumpul</span>
                      <strong>{formatRupiah(goal.nominalTerkumpul)}</strong>
                    </div>
                    <div>
                      <span>Target</span>
                      <strong>{formatRupiah(goal.nominalTarget)}</strong>
                    </div>
                  </div>

                  <div className="savings-progress-copy">
                    <strong className="metric-label"><AppIcon name="progress" size={14} /> {progress}%</strong>
                    <span>{isReached ? "Target sudah penuh" : `Sisa ${formatRupiah(remainingAmount)}`}</span>
                  </div>
                  <div
                    className="savings-progress-track"
                    role="progressbar"
                    aria-label={`Progress ${goal.namaTarget}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </div>

                  <div className="savings-meta">
                    {goal.deadline && <span>Deadline {formatDeadline(goal.deadline)}</span>}
                    <p>{goal.catatan}</p>
                  </div>

                  {isFunding && (
                    <div className="savings-funding-form">
                      <label>
                        <span className="field-label"><AppIcon name="coins" size={14} /> Nominal tambahan</span>
                        <input
                          autoFocus
                          inputMode="numeric"
                          min="1"
                          placeholder="Contoh: 50000"
                          type="number"
                          value={additionalAmount}
                          onChange={(event) => {
                            setAdditionalAmount(event.target.value);
                            setGoalMessage(null);
                          }}
                        />
                      </label>
                      <div className="savings-funding-actions">
                        <button type="button" onClick={() => handleAddAmount(goal)}><AppIcon name="plus" size={14} />Tambah</button>
                        <button className="secondary" type="button" onClick={closeFundingForm}><AppIcon name="refresh" size={14} />Batal</button>
                      </div>
                    </div>
                  )}

                  {currentGoalMessage && (
                    <p className={`goal-message ${currentGoalMessage.type}`}>{currentGoalMessage.text}</p>
                  )}

                  <div className="savings-card-actions">
                    <button type="button" disabled={isReached} onClick={() => openFundingForm(goal.id)}>
                      <AppIcon name={isReached ? "check" : "coins"} size={14} />{isReached ? "Target Penuh" : "Tambah Dana"}
                    </button>
                    <button type="button" onClick={() => handleEditGoal(goal.id)}><AppIcon name="pencil" size={13} />Edit</button>
                    <button className="danger" type="button" onClick={() => handleDeleteGoal(goal.id)}><AppIcon name="trash" size={13} />Hapus</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

function validateSavingsForm(
  formData: SavingsFormState,
  targetAmount: number,
  collectedAmount: number
) {
  if (!formData.namaTarget.trim()) {
    return "Nama target wajib diisi.";
  }

  if (!formData.nominalTarget.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    return "Nominal target harus lebih dari 0.";
  }

  if (!Number.isFinite(collectedAmount) || collectedAmount < 0) {
    return "Nominal terkumpul tidak boleh minus.";
  }

  if (collectedAmount > targetAmount) {
    return "Nominal terkumpul tidak boleh melebihi target.";
  }

  return "";
}

function formatDeadline(deadline: string) {
  const date = new Date(`${deadline}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "tidak valid";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export default SavingsGoalsPage;
