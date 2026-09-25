/** The supplied clip plays once at its authored rate; the still is always available. */
const films = new WeakMap<HTMLElement, () => void>();

export function enhanceHeroFilm(root: HTMLElement) {
  if (films.has(root)) return films.get(root)!;
  const video = root.querySelector<HTMLVideoElement>("[data-film-video]");
  const view = root.ownerDocument.defaultView;
  if (!video || !view || !video.dataset.src) return () => {};
  const motion = view.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (view.navigator as Navigator & {
    connection?: { saveData?: boolean };
  }).connection;
  const controller = new view.AbortController();
  let disposed = false;
  let automaticAttempted = false;

  const showStill = () => {
    video.pause();
    video.hidden = true;
  };
  const play = async () => {
    video.muted = true;
    video.defaultMuted = true;
    // No source is attached until motion and data preferences allow playback.
    if (!video.getAttribute("src")) video.src = video.dataset.src!;
    try {
      await video.play();
      if (disposed || motion.matches) showStill();
    } catch {
      // Browser autoplay restrictions and network failures retain the still.
      showStill();
    }
  };
  const followPreferences = () => {
    if (motion.matches) {
      showStill();
      if (video.hasAttribute("src")) {
        video.removeAttribute("src");
        video.load();
      }
      return;
    }
    if (!automaticAttempted && !connection?.saveData) {
      automaticAttempted = true;
      void play();
    }
  };
  video.addEventListener("playing", () => {
    if (disposed || motion.matches) showStill();
    else video.hidden = false;
  }, { signal: controller.signal });
  video.addEventListener("error", showStill, { signal: controller.signal });
  motion.addEventListener("change", followPreferences, { signal: controller.signal });
  const cleanup = () => {
    disposed = true;
    controller.abort();
    showStill();
    films.delete(root);
  };
  films.set(root, cleanup);
  followPreferences();
  return cleanup;
}
