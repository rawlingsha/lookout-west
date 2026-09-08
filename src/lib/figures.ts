import registry from "../data/share-figures.json";
import { contentUrl } from "./urls";
import type { ShareImages } from "./share";

export const shareFigures = registry;
export type ShareFigure = (typeof registry)[number];
export const figureArticleUrl = (figure: ShareFigure) => contentUrl(`/research/${figure.article}/`, { fragment: `figure-${figure.id}` });
export const figurePagePath = (figure: ShareFigure) => `/visualizations/${figure.article}/${figure.id}/`;
export function figureShareImages(figure: ShareFigure): ShareImages | undefined {
  if (!figure.image) return undefined;
  const base = `/social/generated/figures/${figure.id}`;
  return { preview: `${base}-preview.jpg`, portrait: `${base}-portrait.jpg`, story: `${base}-story.jpg`, alt: figure.alt ?? figure.title };
}
