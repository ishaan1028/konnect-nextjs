"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

/** Long captions show two lines and a "more" button, like Instagram. */
const isLong = (caption: string) => caption.length > 125 || caption.split("\n").length > 2;

export function PostCaption({ username, caption }: { username: string; caption: string }) {
  const [expanded, setExpanded] = useState(false);
  const clamp = isLong(caption) && !expanded;

  return (
    <div className="text-sm">
      <p
        className={
          clamp ? "line-clamp-2 break-words whitespace-pre-line" : "break-words whitespace-pre-line"
        }
      >
        <Link href={`/${username}` as Route} className="mr-1.5 font-semibold hover:underline">
          {username}
        </Link>
        {caption}
      </p>
      {clamp && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          more
        </button>
      )}
    </div>
  );
}
