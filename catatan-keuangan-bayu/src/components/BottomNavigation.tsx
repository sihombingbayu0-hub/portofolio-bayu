import type { NavItem, PageKey } from "../data/navigation";
import AppIcon from "./AppIcon";

type BottomNavigationProps = {
  items: NavItem[];
  activePage: PageKey;
  onChangePage: (page: PageKey) => void;
};

function BottomNavigation({ items, activePage, onChangePage }: BottomNavigationProps) {
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {items.map((item) => {
        const isActive = item.key === activePage;

        return (
          <button
            className={isActive ? "nav-button active" : "nav-button"}
            key={item.key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChangePage(item.key)}
          >
            <span className="nav-icon" aria-hidden="true">
              <AppIcon name={item.icon} size={17} />
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNavigation;
