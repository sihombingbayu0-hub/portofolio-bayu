import type { TransactionType } from "./transaction";

export type Category = {
  id: string;
  nama: string;
  jenis: TransactionType;
  ikon: string;
  warna?: string;
  waktuDibuat: string;
};

export type CategoryInput = {
  nama: string;
  jenis: TransactionType;
  ikon: string;
  warna?: string;
};

export type CategoryGroups = {
  pemasukan: Category[];
  pengeluaran: Category[];
};

export type DeleteCategoryResult = {
  categories: Category[];
  error: string;
};
