"use client";

import dynamic from "next/dynamic";

/** Charts load in their own chunk after the article text. */
const Loading = ({ h }: { h: number }) => (
  <div className="box grid place-items-center small muted" style={{ minHeight: h }} role="status">Loading chart.</div>
);

export const TrafficCapacity = dynamic(() => import("./TrafficCapacity"), { ssr: false, loading: () => <Loading h={620} /> });
export const QueueDemo = dynamic(() => import("./QueueDemo"), { ssr: false, loading: () => <Loading h={420} /> });
