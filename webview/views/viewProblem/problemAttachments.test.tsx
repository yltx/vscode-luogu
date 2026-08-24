import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ProblemAttachment } from 'luogu-api';
import { describe, expect, it } from 'vitest';

import ProblemAttachments, { getAttachmentUrl } from './problemAttachments';

const attachment = (
  overrides: Partial<ProblemAttachment> = {}
): ProblemAttachment => ({
  id: 'attachment-id',
  filename: 'test data.zip',
  size: 2048,
  uploadTime: 0,
  downloadLink: '/fe/api/problem/downloadAttachment/test-data.zip',
  ...overrides
});

describe('problem attachments', () => {
  it('does not render an attachment section for an empty list', () => {
    expect(renderToStaticMarkup(<ProblemAttachments attachments={[]} />)).toBe(
      ''
    );
  });

  it('does not render when attachment data is missing', () => {
    expect(
      renderToStaticMarkup(<ProblemAttachments attachments={undefined} />)
    ).toBe('');
  });

  it('renders attachment filename, formatted size, and download link', () => {
    const html = renderToStaticMarkup(
      <ProblemAttachments attachments={[attachment()]} />
    );

    expect(html).toContain('<h2>附件</h2>');
    expect(html).toContain('test data.zip');
    expect(html).toContain('2.00KiB');
    expect(html).toContain(
      'href="https://www.luogu.com.cn/fe/api/problem/downloadAttachment/test-data.zip"'
    );
    expect(html).toContain('download="test data.zip"');
  });

  it('allows HTTPS links and rejects unsafe schemes', () => {
    expect(getAttachmentUrl('https://cdn.luogu.com.cn/file.zip')).toBe(
      'https://cdn.luogu.com.cn/file.zip'
    );
    expect(getAttachmentUrl('javascript:alert(1)')).toBeUndefined();
    expect(getAttachmentUrl('http://example.com/file.zip')).toBeUndefined();
    expect(getAttachmentUrl(undefined)).toBeUndefined();

    const html = renderToStaticMarkup(
      <ProblemAttachments
        attachments={[attachment({ downloadLink: 'javascript:alert(1)' })]}
      />
    );
    expect(html).not.toContain('<a');
    expect(html).toContain('test data.zip');
  });
});
