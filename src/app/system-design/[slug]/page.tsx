import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TutorialView } from "@/components/TutorialView";
import { UpcomingView } from "@/components/UpcomingView";
import { categoryBySlug, platformBySlug, platforms } from "@/content/catalog";
import { getTutorial, readingMinutes } from "@/content/tutorials";

/** Every platform has a page: the tutorial if it exists, otherwise a short "not written yet" page. */
export function generateStaticParams() {
  return platforms.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/system-design/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const t = getTutorial(slug);
  if (t) return { title: t.title, description: t.summary };
  const p = platformBySlug.get(slug);
  // Pages without a tutorial are kept out of search engines until there is something to read.
  return p ? { title: `${p.name} system design`, description: `${p.signature}.`, robots: { index: false } } : {};
}

export default async function PlatformPage({ params }: PageProps<"/system-design/[slug]">) {
  const { slug } = await params;
  const platform = platformBySlug.get(slug);
  if (!platform) notFound();
  const category = categoryBySlug.get(platform.category)!;
  const t = getTutorial(slug);
  if (!t) return <UpcomingView platform={platform} category={category} />;
  return <TutorialView t={t} platform={platform} category={category} minutes={readingMinutes(slug)} />;
}
