import { useState } from "react";
import { Link } from "react-router-dom";

export default function FilterBar({
  categories = [],
  countries = [],
  activeCategory,
  activeCountry,
  hasActiveSearch,
  onSelectCategory,
  onSelectCountry,
  onReset,
  loadingCategories,
  loadingCountries,
}) {
  const [isCategoryOpen, setCategoryOpen] = useState(false);
  const [isCountryOpen, setCountryOpen] = useState(false);

  const toggleCategory = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setCategoryOpen((value) => !value);
    setCountryOpen(false);
  };

  const toggleCountry = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setCountryOpen((value) => !value);
    setCategoryOpen(false);
  };

  const closeMenus = () => {
    setCategoryOpen(false);
    setCountryOpen(false);
  };

  return (
    <header className="header">
      <div className="header-content">
        <nav className="nav-menu">
          <button
            type="button"
            className={`nav-item ${
              !hasActiveSearch &&
              activeCategory === null &&
              activeCountry === null
                ? "active"
                : ""
            }`}
            onClick={() => {
              closeMenus();
              onReset?.();
            }}
          >
            PHIM CHIẾU
          </button>

          <div className="nav-dropdown" onMouseLeave={closeMenus}>
            <button type="button" className="nav-item" onClick={toggleCategory}>
              THỂ LOẠI ▼
            </button>
            {isCategoryOpen && (
              <div className="dropdown-menu">
                {loadingCategories ? (
                  <div className="dropdown-item">Đang tải...</div>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={`dropdown-item ${
                        activeCategory === category.id ? "active" : ""
                      }`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setCategoryOpen(false);
                        onSelectCategory?.(category.id);
                      }}
                      title={category.description || ""}
                    >
                      {category.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="nav-dropdown" onMouseLeave={closeMenus}>
            <button type="button" className="nav-item" onClick={toggleCountry}>
              QUỐC GIA ▼
            </button>
            {isCountryOpen && (
              <div className="dropdown-menu">
                {loadingCountries ? (
                  <div className="dropdown-item">Đang tải...</div>
                ) : (
                  countries.map((country) => (
                    <button
                      key={country.id}
                      type="button"
                      className={`dropdown-item ${
                        activeCountry === country.id ? "active" : ""
                      }`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setCountryOpen(false);
                        onSelectCountry?.(country.id);
                      }}
                    >
                      {country.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <Link to="/contact" className="nav-item" onClick={closeMenus}>
            LIÊN HỆ
          </Link>
        </nav>
      </div>
    </header>
  );
}
