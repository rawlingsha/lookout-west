(() => {
  const init = () => {
    const modal = document.querySelector("[data-subscribe-modal]");
    if (!modal || modal.dataset.initialized === "true") return;

    modal.dataset.initialized = "true";

    const formState = modal.querySelector('[data-subscribe-state="form"]');
    const submittedState = modal.querySelector('[data-subscribe-state="submitted"]');
    const form = modal.querySelector("[data-subscribe-form]");
    const iframe = modal.querySelector('iframe[name="buttondown-subscribe-target"]');
    const emailInput = modal.querySelector("#buttondown-email");
    const openButtons = document.querySelectorAll("[data-subscribe-open]");
    const closeButtons = modal.querySelectorAll("[data-subscribe-close]");

    let lastFocusedElement = null;
    let awaitingResponse = false;
    let iframeInitialized = false;

    const setSubmittedState = (submitted) => {
      if (!formState || !submittedState) return;
      formState.hidden = submitted;
      submittedState.hidden = !submitted;
    };

    const openModal = () => {
      lastFocusedElement = document.activeElement;
      setSubmittedState(false);
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.documentElement.classList.add("has-overlay-open");
      window.requestAnimationFrame(() => {
        if (emailInput) emailInput.focus();
      });
    };

    const closeModal = () => {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("has-overlay-open");
      setSubmittedState(false);
      awaitingResponse = false;
      if (form) form.reset();
      if (lastFocusedElement instanceof HTMLElement) {
        lastFocusedElement.focus();
      }
    };

    openButtons.forEach((button) => {
      button.addEventListener("click", openModal);
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });

    if (form) {
      form.addEventListener("submit", () => {
        awaitingResponse = true;
      });
    }

    if (iframe) {
      iframe.addEventListener("load", () => {
        if (!iframeInitialized) {
          iframeInitialized = true;
          return;
        }

        if (awaitingResponse) {
          awaitingResponse = false;
          setSubmittedState(true);
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
