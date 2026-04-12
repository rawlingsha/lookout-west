(() => {
  const focusableSelector = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(",");

  const init = () => {
    const modal = document.querySelector("[data-subscribe-modal]");
    if (!(modal instanceof HTMLElement)) return;
    if (modal.dataset.initialized === "true") return;

    const dialog = modal.querySelector(".subscribe-modal__dialog");
    const formState = modal.querySelector('[data-subscribe-state="form"]');
    const submittedState = modal.querySelector('[data-subscribe-state="submitted"]');
    const form = modal.querySelector("[data-subscribe-form]");
    const iframe = modal.querySelector('iframe[name="buttondown-subscribe-target"]');
    const emailInput = modal.querySelector("#buttondown-email");
    const openButtons = document.querySelectorAll("[data-subscribe-open]");
    const closeButtons = modal.querySelectorAll("[data-subscribe-close]");

    if (!(dialog instanceof HTMLElement)) return;
    if (!dialog.hasAttribute("tabindex")) {
      dialog.tabIndex = -1;
    }

    modal.dataset.initialized = "true";

    let lastFocusedElement = null;
    let awaitingResponse = false;
    let iframeInitialized = false;

    const isOpen = () => modal.hidden === false;

    const setSubmittedState = (submitted) => {
      if (!(formState instanceof HTMLElement) || !(submittedState instanceof HTMLElement)) {
        return;
      }

      formState.hidden = submitted;
      submittedState.hidden = !submitted;
    };

    const getFocusableElements = () =>
      Array.from(dialog.querySelectorAll(focusableSelector)).filter((element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (element.hasAttribute("disabled")) return false;
        if (element.getAttribute("aria-hidden") === "true") return false;
        if (element.tabIndex === -1) return false;
        return element.getClientRects().length > 0;
      });

    const focusInitialElement = () => {
      if (emailInput instanceof HTMLElement && emailInput.getClientRects().length > 0) {
        emailInput.focus();
        return;
      }

      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
        return;
      }

      dialog.focus();
    };

    const openModal = () => {
      if (isOpen()) return;

      lastFocusedElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      setSubmittedState(false);
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.documentElement.classList.add("has-overlay-open");

      window.requestAnimationFrame(() => {
        focusInitialElement();
      });
    };

    const closeModal = () => {
      if (!isOpen()) return;

      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("has-overlay-open");
      setSubmittedState(false);
      awaitingResponse = false;

      if (form instanceof HTMLFormElement) {
        form.reset();
      }

      if (lastFocusedElement instanceof HTMLElement && lastFocusedElement.isConnected) {
        lastFocusedElement.focus();
      }

      lastFocusedElement = null;
    };

    const handleKeydown = (event) => {
      if (!isOpen()) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    openButtons.forEach((button) => {
      button.addEventListener("click", openModal);
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", handleKeydown);

    if (form instanceof HTMLFormElement) {
      form.addEventListener("submit", () => {
        awaitingResponse = true;
      });
    }

    if (iframe instanceof HTMLIFrameElement) {
      iframe.addEventListener("load", () => {
        if (!iframeInitialized) {
          iframeInitialized = true;
          return;
        }

        if (awaitingResponse) {
          awaitingResponse = false;
          setSubmittedState(true);

          window.requestAnimationFrame(() => {
            const focusable = getFocusableElements();
            if (focusable.length > 0) {
              focusable[0].focus();
            } else {
              dialog.focus();
            }
          });
        }
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
