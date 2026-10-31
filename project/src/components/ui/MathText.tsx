import { Fragment, useMemo } from 'react';
import katex from 'katex';
import { cn } from '@/lib/utils';

// Text between $...$ (inline) or $$...$$ (display) is rendered with KaTeX.
// Everything else goes through React, so user-written text is always escaped.
const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

function renderMath(source: string, displayMode: boolean) {
  return katex.renderToString(source, { displayMode, throwOnError: false, output: 'html', trust: false });
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => text.split(MATH_PATTERN), [text]);

  return (
    <span className={cn('whitespace-pre-line break-words', className)}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          return (
            <span key={index} className="my-2 block overflow-x-auto" dangerouslySetInnerHTML={{ __html: renderMath(part.slice(2, -2), true) }} />
          );
        }
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          return <span key={index} dangerouslySetInnerHTML={{ __html: renderMath(part.slice(1, -1), false) }} />;
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </span>
  );
}
