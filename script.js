const track = document.querySelector(".slides-track");
const slider = document.querySelector(".slider");
const slides = Array.from(document.querySelectorAll(".slide"));
const slideLinks = Array.from(document.querySelectorAll("[data-slide-target]"));
const navLinks = Array.from(document.querySelectorAll(".nav-link"));
const currentSlideLabel = document.querySelector("#currentSlide");
const previousButton = document.querySelector("[data-slide-prev]");
const nextButton = document.querySelector("[data-slide-next]");
const menuButton = document.querySelector(".menu-toggle");
const navPanel = document.querySelector(".nav-panel");

let currentIndex = 0;
let touchStartX = 0;
let touchStartY = 0;

const formatSlideNumber = (index) => String(index + 1).padStart(2, "0");

const resetHorizontalScroll = () => {
  if (slider) slider.scrollLeft = 0;
  track.scrollLeft = 0;
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
};

const setMenuOpen = (isOpen) => {
  navPanel.classList.toggle("open", isOpen);
  menuButton.classList.toggle("is-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
};

const updateActiveState = () => {
  resetHorizontalScroll();
  track.style.transform = `translateX(-${currentIndex * 100}%)`;
  currentSlideLabel.textContent = formatSlideNumber(currentIndex);

  slides.forEach((slide, index) => {
    const isActive = index === currentIndex;
    slide.classList.toggle("active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
    slide.toggleAttribute("inert", !isActive);
    if (isActive) {
      slide.scrollTop = 0;
    }
  });

  requestAnimationFrame(resetHorizontalScroll);

  navLinks.forEach((link) => {
    link.classList.toggle("active", Number(link.dataset.slideTarget) === currentIndex);
  });

  previousButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex === slides.length - 1;
};

const goToSlide = (index, shouldUpdateHash = true) => {
  const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
  currentIndex = nextIndex;
  updateActiveState();
  setMenuOpen(false);

  if (shouldUpdateHash) {
    const targetHash = `#${slides[currentIndex].id}`;
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, "", targetHash);
    }
  }
};

const getSlideIndexFromHash = () => {
  const id = window.location.hash.replace("#", "");
  const foundIndex = slides.findIndex((slide) => slide.id === id);
  return foundIndex >= 0 ? foundIndex : 0;
};

slideLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = Number(link.dataset.slideTarget);
    if (Number.isNaN(target)) return;

    event.preventDefault();
    goToSlide(target);
  });
});

previousButton.addEventListener("click", () => goToSlide(currentIndex - 1));
nextButton.addEventListener("click", () => goToSlide(currentIndex + 1));

menuButton.addEventListener("click", () => {
  setMenuOpen(!navPanel.classList.contains("open"));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuOpen(false);
    return;
  }

  const activeElement = document.activeElement;
  const isTyping = activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);

  if (isTyping) return;
  if (event.key === "ArrowRight") goToSlide(currentIndex + 1);
  if (event.key === "ArrowLeft") goToSlide(currentIndex - 1);
});

track.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

track.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;

  if (Math.abs(deltaX) > 64 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
    goToSlide(currentIndex + (deltaX < 0 ? 1 : -1));
  }
}, { passive: true });

window.addEventListener("hashchange", () => {
  goToSlide(getSlideIndexFromHash(), false);
});

window.addEventListener("resize", resetHorizontalScroll);
window.addEventListener("load", resetHorizontalScroll);

goToSlide(getSlideIndexFromHash(), false);
