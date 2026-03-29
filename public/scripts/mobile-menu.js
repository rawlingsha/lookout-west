const menus = document.querySelectorAll("[data-mobile-menu]");

for (const menu of menus) {
  if (!(menu instanceof HTMLElement)) continue;
  if (menu.dataset.initialized === "true") continue;

  const button = menu.querySelector("[data-mobile-menu-toggle]");
  const panel = menu.querySelector("[data-mobile-menu-panel]");
  const links = menu.querySelectorAll(".mobile-menu__list a");

  if (!(button instanceof HTMLButtonElement)) continue;
  if (!(panel instanceof HTMLElement)) continue;

  const closeMenu = () => {
    button.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  };

  const openMenu = () => {
    button.setAttribute("aria-expanded", "true");
    panel.hidden = false;
  };

  const toggleMenu = () => {
    const isOpen = button.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  button.addEventListener("click", toggleMenu);

  links.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (menu.contains(target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeMenu();
    button.focus();
  });

  menu.dataset.initialized = "true";
}
