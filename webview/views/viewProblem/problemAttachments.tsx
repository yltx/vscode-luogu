import React from 'react';
import type { ProblemAttachment } from 'luogu-api';

import { formatMemory } from '@/utils/stringUtils';

const LUOGU_ORIGIN = 'https://www.luogu.com.cn';

export function getAttachmentUrl(downloadLink: unknown) {
  if (typeof downloadLink !== 'string' || downloadLink.length === 0)
    return undefined;
  try {
    const url = new URL(downloadLink, LUOGU_ORIGIN);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export default function ProblemAttachments({
  attachments
}: {
  attachments?: ProblemAttachment[];
}) {
  if (!attachments?.length) return null;

  return (
    <section className="problemAttachments">
      <h2>附件</h2>
      <ul>
        {attachments.map(attachment => {
          const url = getAttachmentUrl(attachment.downloadLink);
          const filename = attachment.filename || '未命名附件';
          return (
            <li key={attachment.id || attachment.downloadLink}>
              {url ? (
                <a href={url} download={filename}>
                  {filename}
                </a>
              ) : (
                <span>{filename}</span>
              )}
              {Number.isFinite(attachment.size) && attachment.size >= 0 && (
                <span className="attachmentSize">
                  {formatMemory(attachment.size)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
