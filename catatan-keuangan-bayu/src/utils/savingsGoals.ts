import type { SavingsFormState, SavingsGoal, SavingsGoalInput } from "../types/savingsGoal";
import { markStorageIssue } from "./storageHealth";

const SAVINGS_STORAGE_KEY = "uangKuNiSavingsGoals";

// Mengambil target tabungan yang pernah disimpan di perangkat.
export function loadSavingsGoals(): SavingsGoal[] {
  try {
    const savedGoals = localStorage.getItem(SAVINGS_STORAGE_KEY);

    if (!savedGoals) {
      return [];
    }

    const parsedGoals = JSON.parse(savedGoals);

    if (!Array.isArray(parsedGoals)) {
      markStorageIssue("target tabungan");
      return [];
    }

    const normalizedGoals = parsedGoals.map(normalizeSavingsGoal).filter(Boolean) as SavingsGoal[];
    if (normalizedGoals.length !== parsedGoals.length) {
      markStorageIssue("target tabungan");
    }
    return renderSavingsGoals(normalizedGoals);
  } catch {
    markStorageIssue("target tabungan");
    return [];
  }
}

// Menyimpan seluruh perubahan target ke localStorage.
export function saveSavingsGoals(goals: SavingsGoal[]) {
  localStorage.setItem(SAVINGS_STORAGE_KEY, JSON.stringify(goals));
}

export function addSavingsGoal(goals: SavingsGoal[], data: SavingsGoalInput): SavingsGoal[] {
  const currentTime = new Date().toISOString();
  const newGoal: SavingsGoal = {
    id: Date.now(),
    namaTarget: data.namaTarget.trim(),
    nominalTarget: data.nominalTarget,
    nominalTerkumpul: data.nominalTerkumpul,
    deadline: data.deadline?.trim() || undefined,
    catatan: data.catatan.trim() || "Tanpa catatan",
    createdAt: currentTime,
    updatedAt: currentTime
  };

  return renderSavingsGoals([newGoal, ...goals]);
}

// Target terbaru ditampilkan lebih dulu.
export function renderSavingsGoals(goals: SavingsGoal[]): SavingsGoal[] {
  return [...goals].sort((firstGoal, secondGoal) => {
    return new Date(secondGoal.createdAt).getTime() - new Date(firstGoal.createdAt).getTime();
  });
}

export function editSavingsGoal(goals: SavingsGoal[], id: number): SavingsGoal | null {
  return goals.find((goal) => goal.id === id) ?? null;
}

export function updateSavingsGoal(
  goals: SavingsGoal[],
  id: number,
  data: SavingsGoalInput
): SavingsGoal[] {
  const updatedGoals = goals.map((goal) => {
    if (goal.id !== id) {
      return goal;
    }

    return {
      ...goal,
      namaTarget: data.namaTarget.trim(),
      nominalTarget: data.nominalTarget,
      nominalTerkumpul: data.nominalTerkumpul,
      deadline: data.deadline?.trim() || undefined,
      catatan: data.catatan.trim() || "Tanpa catatan",
      updatedAt: new Date().toISOString()
    };
  });

  return renderSavingsGoals(updatedGoals);
}

export function deleteSavingsGoal(goals: SavingsGoal[], id: number): SavingsGoal[] {
  return renderSavingsGoals(goals.filter((goal) => goal.id !== id));
}

export function addSavingsAmount(goals: SavingsGoal[], id: number, amount: number): SavingsGoal[] {
  if (!Number.isFinite(amount) || amount <= 0) {
    return goals;
  }

  const updatedGoals = goals.map((goal) => {
    if (goal.id !== id) {
      return goal;
    }

    return {
      ...goal,
      nominalTerkumpul: Math.min(goal.nominalTarget, goal.nominalTerkumpul + amount),
      updatedAt: new Date().toISOString()
    };
  });

  return renderSavingsGoals(updatedGoals);
}

export function calculateSavingsProgress(goal: SavingsGoal): number {
  if (goal.nominalTarget <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((goal.nominalTerkumpul / goal.nominalTarget) * 100));
}

export function resetSavingsForm(): SavingsFormState {
  return {
    namaTarget: "",
    nominalTarget: "",
    nominalTerkumpul: "",
    deadline: "",
    catatan: ""
  };
}

function normalizeSavingsGoal(goal: Partial<SavingsGoal>): SavingsGoal | null {
  const name = String(goal.namaTarget || "").trim();
  const targetAmount = Number(goal.nominalTarget);
  const collectedAmount = Number(goal.nominalTerkumpul);

  if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    return null;
  }

  const safeCollectedAmount = Number.isFinite(collectedAmount)
    ? Math.min(targetAmount, Math.max(0, collectedAmount))
    : 0;
  const createdAt = String(goal.createdAt || new Date().toISOString());
  const deadline = goal.deadline ? String(goal.deadline) : "";

  return {
    id: Number(goal.id) || Date.now(),
    namaTarget: name,
    nominalTarget: targetAmount,
    nominalTerkumpul: safeCollectedAmount,
    deadline: isValidDateValue(deadline) ? deadline : undefined,
    catatan: String(goal.catatan || "Tanpa catatan").trim() || "Tanpa catatan",
    createdAt,
    updatedAt: String(goal.updatedAt || createdAt)
  };
}

function isValidDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}
