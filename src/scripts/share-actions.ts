/** Local enhancement of server-rendered sharing links; no network SDKs. */
export function initializeShareActions(doc: Document = document) {
  const win = doc.defaultView;
  if (!win) return;
  const narrow = win.matchMedia("(max-width: 56rem)");
  let closeActive: (() => void) | undefined;
  const imageFiles = new Map<string, Promise<File | null>>();

  for (const group of doc.querySelectorAll<HTMLElement>(
    "[data-share-actions]",
  )) {
    if (group.dataset.initialized) continue;
    const disclosure = group.querySelector<HTMLDetailsElement>(
      "[data-share-disclosure]",
    );
    const trigger = disclosure?.querySelector<HTMLElement>("summary");
    const panel = group.querySelector<HTMLElement>("[data-share-panel]");
    const field = panel?.querySelector<HTMLInputElement>("[data-share-url]");
    const inlineStatus = group.querySelector<HTMLElement>(
      "[data-share-status]",
    );
    const panelStatus = panel?.querySelector<HTMLElement>(
      "[data-panel-status]",
    );
    if (
      !disclosure ||
      !trigger ||
      !panel ||
      !field ||
      !inlineStatus ||
      !panelStatus
    )
      continue;
    group.dataset.initialized = "true";
    const payload = {
      title: group.dataset.title ?? "Lookout West",
      text: group.dataset.text ?? "",
      url: group.dataset.url ?? field.value,
    };
    const closeButton =
      panel.querySelector<HTMLButtonElement>("[data-share-close]");
    const dialog = doc.createElement("dialog");
    const enhanced =
      typeof dialog.showModal === "function" &&
      typeof dialog.show === "function";
    let modal = false;

    const status = (message: string) => {
      inlineStatus.textContent = "";
      panelStatus.textContent = "";
      (dialog.open || disclosure.open
        ? panelStatus
        : inlineStatus
      ).textContent = message;
    };
    const position = () => {
      if (!dialog.open || modal) return;
      const anchor = trigger.getBoundingClientRect();
      const width = dialog.getBoundingClientRect().width;
      const height = dialog.getBoundingClientRect().height;
      dialog.style.left = `${Math.max(16, Math.min(anchor.left, win.innerWidth - width - 16))}px`;
      dialog.style.top = `${Math.max(16, Math.min(anchor.bottom + 8, win.innerHeight - height - 16))}px`;
    };
    const close = (returnFocus = true) => {
      if (dialog.open) dialog.close();
      disclosure.open = false;
      trigger.setAttribute("aria-expanded", "false");
      if (modal) doc.documentElement.classList.remove("has-share-dialog");
      modal = false;
      if (closeActive === close) closeActive = undefined;
      if (returnFocus) trigger.focus({ preventScroll: true });
    };
    const open = () => {
      closeActive?.();
      if (!enhanced) {
        disclosure.open = true;
        return;
      }
      // Avoid two independent focus traps if subscription is already open.
      if (doc.documentElement.classList.contains("has-overlay-open")) return;
      modal = narrow.matches;
      if (modal) {
        dialog.showModal();
        doc.documentElement.classList.add("has-share-dialog");
      } else dialog.show();
      trigger.setAttribute("aria-expanded", "true");
      closeActive = close;
      position();
      closeButton?.focus({ preventScroll: true });
    };

    if (enhanced) {
      dialog.className = "share-dialog";
      dialog.id = `${field.id}-dialog`;
      dialog.setAttribute("aria-labelledby", panel.querySelector("h2")!.id);
      dialog.append(panel);
      doc.body.append(dialog);
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("aria-controls", dialog.id);
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        if (dialog.open) close();
        else open();
      });
      if (closeButton) {
        closeButton.hidden = false;
        closeButton.addEventListener("click", () => close());
      }
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        close();
      });
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      });
      dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          close();
      });
      doc.addEventListener("pointerdown", (event) => {
        if (!dialog.open || modal) return;
        if (
          event.target instanceof win.Node &&
          !dialog.contains(event.target) &&
          !group.contains(event.target)
        )
          close(false);
      });
      doc.addEventListener("focusin", (event) => {
        if (!dialog.open || modal) return;
        if (
          event.target instanceof win.Node &&
          !dialog.contains(event.target) &&
          !group.contains(event.target)
        )
          close(false);
      });
      win.addEventListener("resize", position);
      win.addEventListener("scroll", position, { passive: true });
      narrow.addEventListener("change", () => {
        if (dialog.open) close();
      });
      // Expanded helpers can change the height of the desktop panel.
      panel
        .querySelectorAll("details")
        .forEach((helper) => helper.addEventListener("toggle", position));
    }

    field.addEventListener("click", () => field.select());
    const copyButtons = [
      ...group.querySelectorAll<HTMLButtonElement>("[data-copy-link]"),
      ...panel.querySelectorAll<HTMLButtonElement>("[data-copy-link]"),
    ];
    for (const button of new Set(copyButtons)) {
      button.hidden = false;
      let resetTimer: ReturnType<typeof setTimeout>;
      button.addEventListener("click", async () => {
        button.disabled = true;
        const label = button.querySelector<HTMLElement>("[data-copy-label]");
        try {
          if (!win.navigator.clipboard?.writeText)
            throw new Error("Clipboard unavailable");
          await win.navigator.clipboard.writeText(payload.url);
          status("Link copied.");
          if (label) {
            clearTimeout(resetTimer);
            label.textContent = "Copied";
            resetTimer = setTimeout(() => {
              label.textContent = "Copy link";
            }, 2200);
          }
        } catch {
          if (!dialog.open && !disclosure.open) open();
          field.focus();
          field.select();
          status("Copy wasn’t available. Select and copy the link above.");
        } finally {
          button.disabled = false;
        }
      });
    }

    const nativeButton = panel.querySelector<HTMLButtonElement>(
      "[data-native-share]",
    );
    if (nativeButton && typeof win.navigator.share === "function") {
      nativeButton.hidden = false;
      nativeButton.addEventListener("click", async () => {
        nativeButton.disabled = true;
        status("");
        try {
          await win.navigator.share(payload);
        } catch (error) {
          if (!(error instanceof Error && error.name === "AbortError"))
            status(
              "Device sharing wasn’t available. Choose a destination or copy the link.",
            );
        } finally {
          nativeButton.disabled = false;
        }
      });
    }

    const helper = panel.querySelector<HTMLDetailsElement>(
      "[data-image-helper]",
    );
    const imageButton =
      panel.querySelector<HTMLButtonElement>("[data-share-image]");
    if (
      helper &&
      imageButton &&
      typeof win.navigator.canShare === "function" &&
      typeof win.navigator.share === "function"
    ) {
      let file: File | null = null;
      helper.addEventListener("toggle", async () => {
        if (!helper.open || file) return;
        const path = imageButton.dataset.shareImage!;
        if (!imageFiles.has(path))
          imageFiles.set(
            path,
            (async () => {
              try {
                const response = await win.fetch(path);
                if (!response.ok) return null;
                const blob = await response.blob();
                if (!blob.type.startsWith("image/")) return null;
                return new win.File([blob], path.split("/").pop()!, {
                  type: blob.type,
                });
              } catch {
                return null;
              }
            })(),
          );
        file = await imageFiles.get(path)!;
        if (!file) imageFiles.delete(path);
        try {
          if (file && win.navigator.canShare({ files: [file] }))
            imageButton.hidden = false;
        } catch {
          // Some browsers expose the API but reject this payload. Downloads remain available.
          imageButton.hidden = true;
        }
        position();
      });
      imageButton.addEventListener("click", async () => {
        if (!file) return;
        imageButton.disabled = true;
        status("");
        try {
          await win.navigator.share({ files: [file] });
        } catch (error) {
          if (!(error instanceof Error && error.name === "AbortError"))
            status(
              "Use Download Story image, then add the image in Instagram.",
            );
        } finally {
          imageButton.disabled = false;
        }
      });
    }
  }
}

if (typeof document !== "undefined") initializeShareActions();
