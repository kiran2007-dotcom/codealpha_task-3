import React from 'react';

interface RichPostTextProps {
  text: string;
  onSelectHashtag?: (tag: string) => void;
}

export function RichPostText({ text, onSelectHashtag }: RichPostTextProps) {
  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('#') && part.length > 1) {
          const cleanTag = part.slice(1).toLowerCase();
          return (
            <button
              key={`${idx}-${cleanTag}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectHashtag?.(cleanTag);
              }}
              className="text-zinc-900 dark:text-zinc-100 font-semibold hover:underline"
            >
              {part}
            </button>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
}
