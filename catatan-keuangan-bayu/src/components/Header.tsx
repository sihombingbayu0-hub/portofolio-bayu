type HeaderProps = {
  activeTitle: string;
};

function Header({ activeTitle }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-copy">
        <span className="screen-label">{activeTitle}</span>
        <p>Halo, Bayu</p>
        <h1>Pantau uangmu</h1>
      </div>
      <div className="header-brand" aria-label="Uang Ku Ni">
        <span className="icon-circle icon-premium" aria-hidden="true">
          <img className="brand-logo-image" src="./brand-logo.png" alt="" />
        </span>
        <span className="header-brand-label">Uang Ku Ni</span>
      </div>
    </header>
  );
}

export default Header;
