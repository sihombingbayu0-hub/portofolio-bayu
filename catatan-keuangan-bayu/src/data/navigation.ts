import type { IconName } from "../components/AppIcon";

export type PageKey = "dashboard" | "transaksi" | "riwayat" | "laporan" | "tabungan" | "pengaturan";

export type NavItem = {
  key: PageKey;
  label: string;
  icon: IconName;
};

export const navItems: NavItem[] = [
  {
    key: "dashboard",
    label: "Beranda",
    icon: "home"
  },
  {
    key: "transaksi",
    label: "Catat",
    icon: "plus"
  },
  {
    key: "riwayat",
    label: "Riwayat",
    icon: "history"
  },
  {
    key: "pengaturan",
    label: "Atur",
    icon: "settings"
  }
];
