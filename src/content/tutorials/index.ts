import { Tutorial } from "@/lib/schema";
import { irctc } from "./irctc";
import { netflix } from "./netflix";
import { ola } from "./ola";
import { rapido } from "./rapido";
import { ticketmaster } from "./ticketmaster";
import { uber } from "./uber";

/**
 * Published tutorials only. A tutorial appears on the site when it is registered here;
 * work in progress stays out of this list (and out of the public build) until it is ready.
 */
export const tutorialInputs = { irctc, netflix, ola, rapido, ticketmaster, uber } as const;

const cache = new Map<string, Tutorial>();

export function getTutorial(slug: string): Tutorial | undefined {
  if (!(slug in tutorialInputs)) return undefined;
  if (!cache.has(slug)) cache.set(slug, Tutorial.parse(tutorialInputs[slug as keyof typeof tutorialInputs]));
  return cache.get(slug);
}

export const tutorialSlugs = Object.keys(tutorialInputs);
export const hasTutorial = (slug: string) => slug in tutorialInputs;

/** Estimated from word count at 220 words per minute, rounded to 5 minutes. */
export function readingMinutes(slug: string): number {
  const words = JSON.stringify(tutorialInputs[slug as keyof typeof tutorialInputs] ?? "").split(/\s+/).length;
  return Math.max(5, Math.round(words / 220 / 5) * 5);
}
