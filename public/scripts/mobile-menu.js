const menus = document.querySelectorAll("[data-mobile-menu]");

for (const menu of menus) {
  if (!(menu instanceof HTMLElement)) continue;
  if (menu.dataset.initialized === "true") continue;

  const button = menu.querySelector("[data-mobile-menu-toggle]");
  const panel = menu.querySelector("[data-mobile-menu-panel]");
  const links = Array.from(menu.querySelectorAll(".mobile-menu__list a")).filter(
    (link) => link instanceof HTMLAnchorElement
  );

  if (!(button instanceof HTMLButtonElement)) continue;
  if (!(panel instanceof HTMLElement)) continue;

  const isOpen = () => button.getAttribute("aria-expanded") === "true";

  const focusFirstLink = () => {
    const firstLink = links[0];
    if (firstLink instanceof HTMLAnchorElement) {
      firstLink.focus();
    }
  };

  const closeMenu = ({ returnFocus = false } = {}) => {
    if (!isOpen() && panel.hidden) return;

    button.setAttribute("aria-expanded", "false");
    panel.hidden = true;

    if (returnFocus) {
      button.focus();
    }
  };

  const openMenu = () => {
    if (isOpen()) return;

    button.setAttribute("aria-expanded", "true");
    panel.hidden = false;

    window.requestAnimationFrame(() => {
      focusFirstLink();
    });
  };

  const toggleMenu = () => {
    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  button.addEventListener("click", toggleMenu);

  links.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!isOpen()) return;

    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menu.contains(target)) return;

    closeMenu();
  });

  document.addEventListener("focusin", (event) => {
    if (!isOpen()) return;

    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menu.contains(target)) return;

    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isOpen()) return;

    event.preventDefault();
    closeMenu({ returnFocus: true });
  });

  menu.dataset.initialized = "true";
}
