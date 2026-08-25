import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  VSCodeButton,
  VSCodeCheckbox,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeProgressRing,
  VSCodeTextArea,
  VSCodeTextField
} from './uiToolkit';

describe('webview UI compatibility components', () => {
  it('renders accessible native buttons with safe form defaults', () => {
    const html = renderToStaticMarkup(
      <VSCodeButton appearance="secondary" disabled>
        Save
      </VSCodeButton>
    );

    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('vscode-button-secondary');
  });

  it('preserves explicit submit button behavior', () => {
    expect(
      renderToStaticMarkup(<VSCodeButton type="submit">Login</VSCodeButton>)
    ).toContain('type="submit"');
  });

  it('renders native text controls with value and disabled semantics', () => {
    const field = renderToStaticMarkup(
      <VSCodeTextField value="user" disabled readOnly />
    );
    const area = renderToStaticMarkup(
      <VSCodeTextArea value="post" resize="vertical" readOnly />
    );

    expect(field).toContain('<input');
    expect(field).toContain('value="user"');
    expect(field).toContain('disabled=""');
    expect(area).toContain('<textarea');
    expect(area).toContain('style="resize:vertical"');
    expect(area).toContain('>post</textarea>');
  });

  it('renders a labelled native select and options', () => {
    const html = renderToStaticMarkup(
      <VSCodeDropdown ariaLabelledby="Language" defaultValue="cpp">
        <VSCodeOption value="cpp">C++</VSCodeOption>
      </VSCodeDropdown>
    );

    expect(html).toContain('<select');
    expect(html).toContain('aria-label="Language"');
    expect(html).toContain('<option value="cpp" selected="">C++</option>');
  });

  it('associates checkbox text with the native checkbox control', () => {
    const html = renderToStaticMarkup(
      <VSCodeCheckbox checked disabled readOnly>
        Auto refresh
      </VSCodeCheckbox>
    );

    expect(html).toContain('<label');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked=""');
    expect(html).toContain('disabled=""');
    expect(html).toContain('<span>Auto refresh</span>');
  });

  it('exposes loading state to assistive technology', () => {
    const html = renderToStaticMarkup(<VSCodeProgressRing />);

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Loading"');
  });
});
