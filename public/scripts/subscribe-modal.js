(() => {
  const init = () => {
    // Buttondown's post-subscription redirect supplies this flag only after
    // accepting the signup. This is distinct from confirming the subscription.
    const notice = document.querySelector("[data-subscribe-confirmation]");
    const url = new URL(window.location.href);
    if (notice instanceof HTMLElement && !notice.dataset.initialized) {
      notice.dataset.initialized = "true";
      if (url.searchParams.get("subscription") === "check-email") {
        notice.hidden = false;
        window.requestAnimationFrame(() => {
          notice.querySelector("[data-confirmation-title]").textContent =
            "Confirmation email sent";
          notice.querySelector("[data-confirmation-description]").textContent =
            "Check your inbox to finish subscribing.";
        });
        // Keep the return URL clean; refreshing or sharing it must not replay
        // a success message. Preserve any unrelated query parameters/hash.
        url.searchParams.delete("subscription");
        window.history.replaceState(window.history.state, "", url);
      }
      notice
        .querySelector("[data-confirmation-dismiss]")
        .addEventListener("click", () => {
          notice.hidden = true;
          // Avoid leaving keyboard focus on a newly hidden control.
          document.querySelector("main")?.focus({ preventScroll: true });
        });
    }

    // A normal POST preserves Buttondown's validation, CAPTCHA and confirmation
    // pages. Never fetch this endpoint or claim success before its response.
    document.querySelectorAll("[data-subscribe-form]").forEach((form) => {
      if (!(form instanceof HTMLFormElement) || form.dataset.initialized)
        return;
      form.dataset.initialized = "true";
      const email = form.querySelector('input[type="email"]');
      const submit = form.querySelector('button[type="submit"]');
      const status = form.querySelector("[data-subscribe-status]");
      const recovery = form.querySelector("[data-subscribe-recovery]");
      let timer;
      let pending = false;

      const reset = () => {
        window.clearTimeout(timer);
        pending = false;
        submit.disabled = false;
        submit.textContent = "Subscribe";
        form.removeAttribute("aria-busy");
        status.textContent = "";
        recovery.hidden = true;
      };

      email.addEventListener("invalid", () => {
        email.setAttribute("aria-invalid", "true");
        status.textContent =
          "Enter a valid email address, such as you@example.com.";
      });
      email.addEventListener("input", () => {
        email.removeAttribute("aria-invalid");
        if (!pending) status.textContent = "";
      });
      form.addEventListener("submit", (event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        if (!navigator.onLine) {
          event.preventDefault();
          status.textContent =
            "You’re offline. Reconnect and try again; your email is still here.";
          return;
        }
        pending = true;
        recovery.hidden = true;
        submit.disabled = true;
        submit.textContent = "Continuing…";
        form.setAttribute("aria-busy", "true");
        status.textContent = "Continuing to confirm your subscription…";
        // If navigation stalls, keep a way forward without asserting failure
        // or clearing the address. Browser Back restores a usable form too.
        timer = window.setTimeout(() => {
          reset();
          recovery.hidden = false;
        }, 12000);
      });
      window.addEventListener("pageshow", reset);
    });

    const modal = document.querySelector("[data-subscribe-modal]");
    if (
      !(modal instanceof HTMLDialogElement) ||
      typeof modal.showModal !== "function" ||
      modal.dataset.initialized
    )
      return;
    modal.dataset.initialized = "true";
    let opener = null;

    document.querySelectorAll("[data-subscribe-open]").forEach((link) => {
      link.setAttribute("aria-haspopup", "dialog");
      link.setAttribute("aria-controls", modal.id);
      link.addEventListener("click", (event) => {
        // Preserve open-in-new-tab and all native link fallback behavior.
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        if (modal.open) return;
        modal.showModal();
        event.preventDefault();
        opener = link;
        document.documentElement.classList.add("has-overlay-open");
        modal.querySelector('input[type="email"]').focus();
      });
    });
    modal
      .querySelector("[data-subscribe-close]")
      .addEventListener("click", () => modal.close());
    // Only dismiss an actual backdrop click, not a drag out of the form.
    let backdropStart = false;
    modal.addEventListener("pointerdown", (event) => {
      backdropStart = event.target === modal;
    });
    modal.addEventListener("click", (event) => {
      if (backdropStart && event.target === modal) modal.close();
      backdropStart = false;
    });
    modal.addEventListener("close", () => {
      document.documentElement.classList.remove("has-overlay-open");
      if (opener?.isConnected) opener.focus();
      opener = null;
    });
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
