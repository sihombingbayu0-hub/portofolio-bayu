import type { Category } from "./category";
import type { SavingsGoal } from "./savingsGoal";
import type { Transaction } from "./transaction";

export type BackupData = {
  transactions: Transaction[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  exportedAt: string;
  appName: string;
  version: string;
};

export type DataMessage = {
  text: string;
  type: "error" | "success";
};

export type BackupValidationResult = {
  valid: boolean;
  message: string;
  data: BackupData | null;
};
