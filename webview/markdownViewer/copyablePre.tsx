import React, { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { VSCodeButton } from '@w/components/uiToolkit';

interface CopyablePreProps extends React.ComponentProps<'pre'> {
  className?: string;
}

export function CopyablePre({
  children,
  className,
  ...props
}: CopyablePreProps) {
  const pre = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <pre {...props} ref={pre} className={`${className ?? ''} markdown-code`}>
      {children}
      <div className="copyButton">
        <VSCodeButton
          appearance="icon"
          aria-label={copied ? '已复制代码' : '复制代码'}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                pre.current?.querySelector('code')?.textContent ?? ''
              );
              setCopied(true);
              setError(false);
            } catch {
              setError(true);
            }
          }}
          onAnimationEnd={() => setCopied(false)}
        >
          <FontAwesomeIcon
            icon={faCopy}
            className={copied ? 'animate' : undefined}
          />
        </VSCodeButton>
      </div>
      {error && <span role="alert">复制失败，请重试</span>}
    </pre>
  );
}
