"use client";

import { useState } from "react";

export function ExpandableText({ children, previewLines = 3 }: { children: string; previewLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <p className={`${expanded ? "" : previewLines === 1 ? "line-clamp-1" : "line-clamp-3"} whitespace-pre-wrap text-sm leading-6 text-stone-700`}>
        {children}
      </p>
      {children.length > 120 ? (
        <button className="mt-2 text-xs font-medium text-red-700 hover:text-red-900" onClick={() => setExpanded((value) => !value)} type="button">
          {expanded ? "收起" : "展开查看"}
        </button>
      ) : null}
    </div>
  );
}
