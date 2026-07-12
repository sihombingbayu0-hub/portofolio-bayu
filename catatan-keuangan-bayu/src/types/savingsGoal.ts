export type SavingsGoal = {
  id: number;
  namaTarget: string;
  nominalTarget: number;
  nominalTerkumpul: number;
  deadline?: string;
  catatan: string;
  createdAt: string;
  updatedAt: string;
};

export type SavingsGoalInput = {
  namaTarget: string;
  nominalTarget: number;
  nominalTerkumpul: number;
  deadline?: string;
  catatan: string;
};

export type SavingsFormState = {
  namaTarget: string;
  nominalTarget: string;
  nominalTerkumpul: string;
  deadline: string;
  catatan: string;
};
