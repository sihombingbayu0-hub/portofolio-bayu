const smartBinToast = document.querySelector(".sb-toast");
let smartBinToastTimer;

const escapeCodeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

document.querySelectorAll(".sb-source-body code").forEach((codeBlock) => {
  const source = codeBlock.textContent;
  const tokenPattern = /\/\/.*$|"(?:\\.|[^"\\])*"|\b(?:bool|char|const|constexpr|else|false|float|for|if|int|long|return|true|uint8_t|unsigned|void)\b|\b\d+(?:\.\d+)?(?:f|UL)?\b/gm;
  let cursor = 0;
  let highlighted = "";

  source.replace(tokenPattern, (token, offset) => {
    highlighted += escapeCodeHtml(source.slice(cursor, offset));

    let tokenClass = "keyword";
    if (token.startsWith("//")) tokenClass = "comment";
    if (token.startsWith('"')) tokenClass = "string";
    if (/^\d/.test(token)) tokenClass = "number";

    highlighted += `<span class="code-token ${tokenClass}">${escapeCodeHtml(token)}</span>`;
    cursor = offset + token.length;
    return token;
  });

  highlighted += escapeCodeHtml(source.slice(cursor));
  codeBlock.innerHTML = highlighted;
});

const showSmartBinToast = (message) => {
  if (!smartBinToast) return;
  smartBinToast.textContent = message;
  smartBinToast.classList.add("is-visible");
  window.clearTimeout(smartBinToastTimer);
  smartBinToastTimer = window.setTimeout(() => {
    smartBinToast.classList.remove("is-visible");
  }, 2200);
};

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;

    try {
      await navigator.clipboard.writeText(target.textContent.trim());
      showSmartBinToast("Berhasil disalin");
    } catch (error) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      showSmartBinToast("Teks dipilih. Tekan Ctrl+C untuk menyalin.");
    }
  });
});

document.querySelectorAll("[data-tabs]").forEach((tabs) => {
  const tabButtons = Array.from(tabs.querySelectorAll('[role="tab"]'));
  const tabPanels = Array.from(tabs.querySelectorAll('[role="tabpanel"]'));

  const activateTab = (selectedTab) => {
    tabButtons.forEach((tab) => {
      const isSelected = tab === selectedTab;
      tab.setAttribute("aria-selected", String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });

    tabPanels.forEach((panel) => {
      panel.hidden = panel.id !== selectedTab.getAttribute("aria-controls");
    });
  };

  tabButtons.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();

      let nextIndex = index;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabButtons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabButtons.length - 1;

      activateTab(tabButtons[nextIndex]);
      tabButtons[nextIndex].focus();
    });
  });
});

const lightbox = document.querySelector(".sb-lightbox");
const lightboxImage = lightbox?.querySelector("img");
const lightboxCaption = lightbox?.querySelector("p");
const lightboxClose = lightbox?.querySelector(".sb-lightbox-close");

document.querySelectorAll("[data-lightbox-src]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    if (!lightbox || !lightboxImage || !lightboxCaption) return;

    lightboxImage.src = trigger.dataset.lightboxSrc;
    lightboxImage.alt = trigger.dataset.lightboxAlt || "Preview dokumentasi Smart Bin";
    lightboxCaption.textContent = trigger.dataset.lightboxAlt || "Dokumentasi Smart Bin";
    lightbox.showModal();
    lightboxClose?.focus();
  });
});

lightboxClose?.addEventListener("click", () => lightbox.close());
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});
