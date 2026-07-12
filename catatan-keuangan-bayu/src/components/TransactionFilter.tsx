import AppIcon from "./AppIcon";
import type { TransactionFilters } from "../types/transaction";

type TransactionFilterProps = {
  categories: string[];
  filters: TransactionFilters;
  onFilterChange: (field: keyof TransactionFilters, value: string) => void;
  onResetFilters: () => void;
};

function TransactionFilter({
  categories,
  filters,
  onFilterChange,
  onResetFilters
}: TransactionFilterProps) {
  return (
    <form className="filter-card" aria-label="Filter transaksi">
      <div className="filter-head">
        <div>
          <h2 className="heading-with-icon"><AppIcon name="filter" size={17} /> Filter</h2>
          <p>Filter ringan biar riwayat cepat ketemu.</p>
        </div>
        <button type="button" onClick={onResetFilters}>
          <AppIcon name="refresh" size={14} /><span>Reset</span>
        </button>
      </div>

      <div className="filter-grid">
        <label>
          <span className="field-label"><AppIcon name="swap" size={14} /> Jenis</span>
          <select
            value={filters.jenis}
            onChange={(event) => onFilterChange("jenis", event.target.value)}
          >
            <option value="semua">Semua</option>
            <option value="pemasukan">Pemasukan</option>
            <option value="pengeluaran">Pengeluaran</option>
          </select>
        </label>

        <label>
          <span className="field-label"><AppIcon name="tag" size={14} /> Kategori</span>
          <select
            value={filters.kategori}
            onChange={(event) => onFilterChange("kategori", event.target.value)}
          >
            <option value="semua">Semua kategori</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label"><AppIcon name="calendar" size={14} /> Bulan</span>
          <input
            type="month"
            value={filters.bulan}
            onChange={(event) => onFilterChange("bulan", event.target.value)}
          />
        </label>

        <label>
          <span className="field-label"><AppIcon name="search" size={14} /> Cari</span>
          <input
            type="search"
            placeholder="Contoh: makan"
            value={filters.keyword}
            onChange={(event) => onFilterChange("keyword", event.target.value)}
          />
        </label>
      </div>
    </form>
  );
}

export default TransactionFilter;
