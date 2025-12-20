import baseList from "./database.js";
import { useState, useEffect, useRef, useMemo } from "react";
import { IoArrowUp } from "react-icons/io5";
import "./App.css";

const App = () => {
  const [base] = useState(baseList);
  const [selectedCase, setSelectedCase] = useState(base[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileAccordionOpen, setIsMobileAccordionOpen] = useState(false);

  const itemsPerPage = 3;
  const inputRef = useRef();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // === Определение мобильного устройства ===
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width <= 768 && 'ontouchstart' in window;
      setIsMobile(mobile);
      setIsMobileAccordionOpen(!mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // === Удаление preloader ===
  useEffect(() => {
    if (document.body.classList.contains("loaded")) return;
    document.body.classList.add("loaded");
    const timer = setTimeout(() => {
      const preloader = document.getElementById("preloader");
      if (preloader) preloader.remove();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // === Проверка темы ===
  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const enabled = saved ? JSON.parse(saved) : prefersDark;
    setIsDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark-mode");
    }
  }, []);

  // === Переключение темы ===
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("darkMode", JSON.stringify(newMode));
    if (newMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark-mode");
    }
  };

  // === Фильтрация (оптимизировано) ===
  const filteredCases = useMemo(() => {
    if (!searchTerm.trim()) return base;
    const query = searchTerm.toLowerCase().trim();
    return base.filter((item) => {
      return (
        item.situation.toLowerCase().includes(query) ||
        item.nursingExamination.toLowerCase().includes(query) ||
        item.inspection.toLowerCase().includes(query) ||
        item.appointment.toLowerCase().includes(query) ||
        item.anamnesis.toLowerCase().includes(query) ||
        item.patientProblems.some((p) => p.problem.toLowerCase().includes(query)) ||
        item.nursingCarePlan.some(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.plan.some((pl) => pl.planItem.toLowerCase().includes(query))
        )
      );
    });
  }, [base, searchTerm]);

  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCases = filteredCases.slice(startIndex, startIndex + itemsPerPage);

  const hasResults = filteredCases.length > 0;
  const displayedCases = hasResults ? currentCases : base;

  // === Навигация ===
  const goToPage = (page) => setCurrentPage(page);
  const nextPage = () => currentPage < totalPages && goToPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && goToPage(currentPage - 1);

  // === Смена кейса с анимацией ===
  const changeCaseWithAnimation = (newCase) => {
    if (selectedCase.id === newCase.id) return;
    setIsAnimating(true);
    setTimeout(() => {
      setSelectedCase(newCase);
      setIsAnimating(false);
      if (isMobile) {
        setIsMobileAccordionOpen(false);
      }
      // Прокрутка к активному элементу
      const activeElement = document.querySelector('.case-item.active');
      activeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  // === Горячие клавиши ===
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.classList.add("focus-hint");
        setTimeout(() => inputRef.current?.classList.remove("focus-hint"), 600);
      } else if (e.key === "ArrowRight") {
        if (currentPage < totalPages) nextPage();
        playSwipeSound();
      } else if (e.key === "ArrowLeft") {
        if (currentPage > 1) prevPage();
        playSwipeSound();
      } else if (e.key === "t" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleDarkMode();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentPage, totalPages, isDarkMode]);

  // === Звук свайпа (лёгкий системный) ===
  const playSwipeSound = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const utterance = new SpeechSynthesisUtterance("");
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  };

  // === Подсветка текста ===
  const highlightText = (text, query) => {
    if (!query || !text) return <span>{text}</span>;
    const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) return <span>{text}</span>;
    const escaped = keywords.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="highlight">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // === Свайпы ===
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) < threshold) return;
    if (diff > 0 && currentPage < totalPages) {
      nextPage();
      playSwipeSound();
    } else if (diff < 0 && currentPage > 1) {
      prevPage();
      playSwipeSound();
    }
  };

  // === Вынесенный список кейсов (без дублирования) ===
  const renderCaseList = () => (
    <>
      <div className="case-list-header">
        <h3>
          Кейсы {searchTerm && `(${filteredCases.length} найдено)`}
        </h3>

        {!isMobile && (
          <div className="search-and-pagination">
            <div className="search-in-header">
              <span className="search-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Поиск по списку..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="search-input-header"
              />
              {searchTerm && (
                <>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="clear-btn-header"
                    aria-label="Очистить поиск"
                  >
                    ×
                  </button>
                  <small className="search-counter">{searchTerm.length}</small>
                </>
              )}
            </div>

            {!searchTerm && totalPages > 1 && (
              <div className="ios-pagination">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="ios-pagination-arrow"
                  aria-label="Предыдущая страница"
                >
                  ◀
                </button>
                <div className="ios-pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => {
                    const page = i + 1;
                    const isCurrent = page === currentPage;
                    const isNear = Math.abs(page - currentPage) <= 1;
                    const isFirstOrLast = page === 1 || page === totalPages;
                    if (isFirstOrLast || isNear) {
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`ios-pagination-page ${isCurrent ? "active" : ""}`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="ios-pagination-ellipsis">
                          …
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="ios-pagination-arrow"
                  aria-label="Следующая страница"
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!hasResults ? (
        <div className="no-results-illustrated">
          <span>🫥</span>
          <p>Ничего не найдено</p>
        </div>
      ) : (
        displayedCases.map((item) => {
          const isMatch = filteredCases.includes(item);
          return (
            <div
              key={item.id}
              className={`case-item ${selectedCase.id === item.id ? "active" : ""}`}
              onClick={() => isMatch && changeCaseWithAnimation(item)}
              style={{
                opacity: isMatch ? 1 : 0.6,
                cursor: isMatch ? "pointer" : "not-allowed",
              }}
              onContextMenu={(e) => {
                if (isMobile) e.preventDefault();
              }}
            >
              <div className="case-item-left">
                <strong>Кейс {item.id}</strong>
                <p>{highlightText(item.situation.substring(0, 80) + "...", searchTerm)}</p>
                {!isMatch && (
                  <small style={{ color: "#e53e30", fontSize: "12px" }}>не соответствует</small>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );

  return (
    <div
      className="app"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <header className="app-header">
        <h1>Медицинские кейсы</h1>

        {/* Глобальный поиск на мобильных */}
        {isMobile && (
          <div className="global-search-mobile">
            <div className="search-in-header">
              <span className="search-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Поиск по всем кейсам..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="search-input-header"
              />
              {searchTerm && (
                <>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="clear-btn-header"
                    aria-label="Очистить поиск"
                  >
                    ×
                  </button>
                  <small className="search-counter">{searchTerm.length}</small>
                </>
              )}
            </div>
          </div>
        )}

        <div className="stats-container">
          <div className="stats-bar">
            <span className="stat-item">
              📁 <strong>{base.length}</strong> кейс(а/ов)
            </span>
            {searchTerm && (
              <span
                className={`stat-item stat-found ${filteredCases.length === 0 ? "stat-found-zero" : ""}`}
              >
                🔍 Найдено: <strong>{filteredCases.length}</strong>
              </span>
            )}
          </div>

          <div className="theme-toggle-container">
            <span className="theme-label">☀️</span>
            <button
              onClick={toggleDarkMode}
              className={`theme-toggle-switch ${isDarkMode ? "dark" : "light"}`}
              aria-label={isDarkMode ? "Светлая тема" : "Тёмная тема"}
            >
              <span className="toggle-thumb"></span>
            </button>
            <span className="theme-label">🌙</span>
          </div>
        </div>

        {!isMobile && (
          <p className="search-hint">
            💡 Нажмите <kbd>/</kbd>, чтобы начать поиск
          </p>
        )}
      </header>

      <div className="app-container">
        {/* Список кейсов */}
        {isMobile ? (
          <div className="case-list-mobile-wrapper">
            <div className="mobile-accordion">
              <button
                className="mobile-accordion-header"
                onClick={() => setIsMobileAccordionOpen((prev) => !prev)}
              >
                <h3>Кейсы {searchTerm && `(${filteredCases.length} найдено)`}</h3>
                <span className={`accordion-arrow ${isMobileAccordionOpen ? "up" : "down"}`}>▼</span>
              </button>

              <div
                className="mobile-accordion-panel"
                style={{
                  maxHeight: isMobileAccordionOpen
                    ? `${document.getElementById(`case-list-panel-height`)?.scrollHeight + 20}px`
                    : "0",
                  opacity: isMobileAccordionOpen ? 1 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease",
                }}
              >
                <div id="case-list-panel-height">
                  {!searchTerm && totalPages > 1 && (
                    <div className="ios-pagination" style={{ margin: "8px 16px" }}>
                      <button onClick={prevPage} disabled={currentPage === 1} className="ios-pagination-arrow">◀</button>
                      <div className="ios-pagination-pages">
                        {Array.from({ length: totalPages }, (_, i) => {
                          const page = i + 1;
                          if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                            return (
                              <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`ios-pagination-page ${page === currentPage ? "active" : ""}`}
                              >
                                {page}
                              </button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="ios-pagination-ellipsis">…</span>;
                          }
                          return null;
                        })}
                      </div>
                      <button onClick={nextPage} disabled={currentPage === totalPages} className="ios-pagination-arrow">▶</button>
                    </div>
                  )}
                  {renderCaseList()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="case-list">{renderCaseList()}</div>
        )}

        {/* Просмотр кейса */}
        <div className={`case-view ${isAnimating ? "fade-out" : "fade-in active"}`}>
          <div className="breadcrumb">
            Кейс {selectedCase.id} • Страница {currentPage} из {Math.ceil(filteredCases.length / itemsPerPage)}
          </div>

          <h2>Кейс {selectedCase.id}</h2>

          <section>
            <h4>Ситуация</h4>
            <p>{highlightText(selectedCase.situation, searchTerm)}</p>
          </section>

          <section>
            <h4>Жалобы и осмотр</h4>
            <p>{highlightText(selectedCase.nursingExamination, searchTerm)}</p>
          </section>

          <section>
            <h4>Анамнез</h4>
            <p>{highlightText(selectedCase.anamnesis || "Не указан", searchTerm)}</p>
          </section>

          <section>
            <h4>Объективно</h4>
            <p>{highlightText(selectedCase.inspection, searchTerm)}</p>
          </section>

          <section>
            <h4>Назначения врача</h4>
            <p>{highlightText(selectedCase.appointment, searchTerm)}</p>
          </section>

          <section>
            <h4>Проблемы пациента</h4>
            <ul>
              {selectedCase.patientProblems.map((prob) => (
                <li key={prob.id}>{highlightText(prob.problem, searchTerm)}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>План сестринского ухода</h4>
            <ol>
              {selectedCase.nursingCarePlan.map((item) => (
                <li key={item.id}>
                  {highlightText(item.title, searchTerm)}
                  {item.plan.length > 0 && (
                    <ul>
                      {item.plan.map((p) => (
                        <li key={p.id}>{highlightText(p.planItem, searchTerm)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {/* Кнопка "Наверх" */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="scroll-top"
        aria-label="Наверх"
      >
        <IoArrowUp />
      </button>
    </div>
  );
};

export default App;
