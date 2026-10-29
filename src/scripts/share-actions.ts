/** Progressive enhancement of local sharing links; no third-party scripts. */
const sessions = new WeakMap<
  Document,
  {
    closeActive?: (restore?: boolean) => void;
    cleanups: Set<() => void>;
    files: Map<string, Promise<File | null>>;
  }
>();

export function cleanupShareActions(doc: Document = document) {
  const session = sessions.get(doc);
  session?.closeActive?.(false);
  session?.cleanups.forEach((cleanup) => cleanup());
  sessions.delete(doc);
}

export function initializeShareActions(doc: Document = document) {
  const win = doc.defaultView;
  if (!win) return;
  let session = sessions.get(doc);
  if (!session) {
    session = { cleanups: new Set(), files: new Map() };
    sessions.set(doc, session);
  }
  const state = session;
  const narrow = win.matchMedia("(max-width: 56rem)");
  const canceled = (error: unknown) =>
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "AbortError";

  for (const group of doc.querySelectorAll<HTMLElement>(
    "[data-share-actions]",
  )) {
    if (group.dataset.initialized) continue;
    const disclosure = group.querySelector<HTMLDetailsElement>(
      "[data-share-disclosure]",
    );
    const trigger = group.querySelector<HTMLButtonElement>(
      "[data-share-trigger]",
    );
    const options = group.querySelector<HTMLButtonElement>(
      "[data-share-options]",
    );
    const panel = group.querySelector<HTMLElement>("[data-share-panel]");
    const field = panel?.querySelector<HTMLInputElement>("[data-share-url]");
    const manual = panel?.querySelector<HTMLElement>("[data-manual-copy]");
    const inlineStatus = group.querySelector<HTMLElement>(
      "[data-share-status]",
    );
    const panelStatus = panel?.querySelector<HTMLElement>(
      "[data-panel-status]",
    );
    if (
      !disclosure ||
      !trigger ||
      !options ||
      !panel ||
      !field ||
      !manual ||
      !inlineStatus ||
      !panelStatus
    )
      continue;
    const controller = new win.AbortController();
    const { signal } = controller;
    const dialog = doc.createElement("dialog");
    const enhanced =
      typeof dialog.showModal === "function" &&
      typeof dialog.show === "function";
    const summary = disclosure.querySelector<HTMLElement>("summary")!;
    group.dataset.initialized = "true";
    const payload: ShareData = {
      title: group.dataset.title ?? "Lookout West",
      url: group.dataset.url ?? field.value,
    };
    if (group.dataset.text) payload.text = group.dataset.text;
    const closeButton =
      panel.querySelector<HTMLButtonElement>("[data-share-close]");
    let modal = false;
    let returnTarget: HTMLElement = enhanced ? trigger : summary;
    let sharing = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
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
      const anchor = returnTarget.getBoundingClientRect();
      const { width, height } = dialog.getBoundingClientRect();
      dialog.style.left = `${Math.max(16, Math.min(anchor.left, win.innerWidth - width - 16))}px`;
      dialog.style.top = `${Math.max(16, Math.min(anchor.bottom + 8, win.innerHeight - height - 16))}px`;
    };
    const close = (restore = true) => {
      if (dialog.open) dialog.close();
      disclosure.open = false;
      trigger.setAttribute("aria-expanded", "false");
      options.setAttribute("aria-expanded", "false");
      if (modal) doc.documentElement.classList.remove("has-share-dialog");
      modal = false;
      if (state.closeActive === close) state.closeActive = undefined;
      if (restore) returnTarget.focus({ preventScroll: true });
    };
    const open = (opener: HTMLElement = enhanced ? trigger : summary) => {
      if (dialog.open || disclosure.open) return;
      state.closeActive?.(false);
      returnTarget = opener;
      manual.hidden = enhanced;
      if (!enhanced) disclosure.open = true;
      else {
        if (doc.documentElement.classList.contains("has-overlay-open")) return;
        modal = narrow.matches;
        if (modal) {
          dialog.showModal();
          doc.documentElement.classList.add("has-share-dialog");
        } else dialog.show();
        trigger.setAttribute("aria-expanded", "true");
        options.setAttribute("aria-expanded", "true");
        position();
        closeButton?.focus({ preventScroll: true });
      }
      state.closeActive = close;
    };
    const nativeShare = async () => {
      if (sharing) return;
      status("");
      if (typeof win.navigator.share !== "function") {
        open();
        return;
      }
      try {
        // Must remain synchronous with the reader's click, including on Safari.
        if (
          typeof win.navigator.canShare === "function" &&
          !win.navigator.canShare(payload)
        ) {
          open();
          return;
        }
        sharing = true;
        await win.navigator.share(payload);
      } catch (error) {
        if (!signal.aborted && !canceled(error)) {
          open();
          status(
            "Device sharing wasn’t available. Choose a destination or copy the link.",
          );
        }
      } finally {
        sharing = false;
      }
    };

    if (enhanced) {
      dialog.className = "share-dialog";
      dialog.id = `${field.id}-dialog`;
      dialog.setAttribute("aria-labelledby", panel.querySelector("h2")!.id);
      dialog.append(panel);
      doc.body.append(dialog);
      disclosure.hidden = true;
      trigger.hidden = false;
      manual.hidden = true;
      for (const button of [trigger, options]) {
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-controls", dialog.id);
        button.setAttribute("aria-expanded", "false");
      }
      options.hidden = typeof win.navigator.share !== "function";
      trigger.addEventListener(
        "click",
        () => (dialog.open ? close() : void nativeShare()),
        { signal },
      );
      options.addEventListener(
        "click",
        () => (dialog.open ? close() : open(options)),
        { signal },
      );
      if (closeButton) {
        closeButton.hidden = false;
        closeButton.addEventListener("click", () => close(), { signal });
      }
      dialog.addEventListener(
        "cancel",
        (event) => {
          event.preventDefault();
          close();
        },
        { signal },
      );
      dialog.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
        },
        { signal },
      );
      dialog.addEventListener(
        "click",
        (event) => {
          if (event.target !== dialog) return;
          const box = dialog.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            close();
        },
        { signal },
      );
      for (const name of ["pointerdown", "focusin"])
        doc.addEventListener(
          name,
          (event) => {
            if (!dialog.open || modal) return;
            if (
              event.target instanceof win.Node &&
              !dialog.contains(event.target) &&
              !group.contains(event.target)
            )
              close(false);
          },
          { signal },
        );
      win.addEventListener("resize", position, { signal });
      win.addEventListener("scroll", position, { passive: true, signal });
      narrow.addEventListener(
        "change",
        () => {
          if (dialog.open) close();
        },
        { signal },
      );
      panel
        .querySelectorAll("details")
        .forEach((helper) =>
          helper.addEventListener("toggle", position, { signal }),
        );
    } else {
      options.hidden = typeof win.navigator.share !== "function";
      panel.id = `${field.id}-panel`;
      options.setAttribute("aria-controls", panel.id);
      options.setAttribute("aria-expanded", "false");
      options.addEventListener(
        "click",
        () => (disclosure.open ? close() : open(options)),
        { signal },
      );
      summary.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          disclosure.open ? close() : void nativeShare();
        },
        { signal },
      );
      group.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape" && disclosure.open) close();
        },
        { signal },
      );
      doc.addEventListener(
        "pointerdown",
        (event) => {
          if (
            disclosure.open &&
            event.target instanceof win.Node &&
            !group.contains(event.target)
          )
            close(false);
        },
        { signal },
      );
    }

    field.addEventListener("click", () => field.select(), { signal });
    const copies = new Set([
      ...group.querySelectorAll<HTMLButtonElement>("[data-copy-link]"),
      ...panel.querySelectorAll<HTMLButtonElement>("[data-copy-link]"),
    ]);
    for (const button of copies) {
      button.hidden = false;
      const label = button.querySelector<HTMLElement>("[data-copy-label]");
      const original = label?.textContent ?? "Copy link";
      let timer: ReturnType<typeof setTimeout>;
      button.addEventListener(
        "click",
        async () => {
          button.disabled = true;
          status("");
          try {
            if (!win.navigator.clipboard?.writeText)
              throw new Error("Clipboard unavailable");
            await win.navigator.clipboard.writeText(payload.url!);
            if (signal.aborted) return;
            status("Link copied.");
            if (label) {
              clearTimeout(timer);
              label.textContent = "Link copied";
              timer = setTimeout(() => {
                label.textContent = original;
                timers.delete(timer);
              }, 2200);
              timers.add(timer);
            }
          } catch {
            if (signal.aborted) return;
            clearTimeout(timer);
            if (label) label.textContent = original;
            open(button);
            manual.hidden = false;
            position();
            field.focus();
            field.select();
            status("Copy wasn’t available. Select and copy the link above.");
          } finally {
            button.disabled = false;
          }
        },
        { signal },
      );
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
      helper.addEventListener(
        "toggle",
        async () => {
          if (!helper.open || file) return;
          const path = imageButton.dataset.shareImage!;
          if (!state.files.has(path))
            state.files.set(
              path,
              (async () => {
                try {
                  const response = await win.fetch(path, { signal });
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
          file = await state.files.get(path)!;
          if (!file) state.files.delete(path);
          if (signal.aborted) return;
          try {
            imageButton.hidden = !(
              file && win.navigator.canShare({ files: [file] })
            );
          } catch {
            imageButton.hidden = true;
          }
          position();
        },
        { signal },
      );
      imageButton.addEventListener(
        "click",
        async () => {
          if (!file) return;
          imageButton.disabled = true;
          status("");
          try {
            await win.navigator.share({ files: [file] });
          } catch (error) {
            if (!canceled(error))
              status(
                "Use Download Story image, then add the image in Instagram.",
              );
          } finally {
            imageButton.disabled = false;
          }
        },
        { signal },
      );
    }
    state.cleanups.add(() => {
      controller.abort();
      timers.forEach(clearTimeout);
      disclosure.append(panel);
      dialog.remove();
      disclosure.hidden = false;
      trigger.hidden = true;
      options.hidden = true;
      delete group.dataset.initialized;
    });
  }
}

if (typeof document !== "undefined") {
  initializeShareActions();
  document.addEventListener("astro:page-load", () => initializeShareActions());
  document.addEventListener("astro:before-swap", () => cleanupShareActions());
}
