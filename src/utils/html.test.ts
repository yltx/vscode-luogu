import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  default: {
    Uri: {
      file: (fsPath: string) => ({ fsPath })
    }
  }
}));

const { getReactWebviewHtml } = await import('./html');

describe('getReactWebviewHtml', () => {
  beforeEach(() => {
    globalThis.distPath = 'C:\\extension\\dist';
  });

  it('creates a nonce-protected React webview document', () => {
    const webview = {
      cspSource: 'vscode-webview-resource:',
      asWebviewUri: ({ fsPath }: { fsPath: string }) => ({
        toString: () => `webview:${fsPath.replaceAll('\\', '/')}`
      })
    };

    const html = getReactWebviewHtml(webview as never, 'webview-login.js');
    const nonce = html.match(/<script defer nonce="([^"]+)"/)?.[1];

    expect(nonce).toBeTruthy();
    expect(html).toContain(
      `script-src vscode-webview-resource: 'nonce-${nonce}'; style-src vscode-webview-resource: 'unsafe-inline'`
    );
    expect(html).toContain(
      '<script defer nonce="' +
        nonce +
        '" src="webview:C:/extension/dist/webview-login.js"></script>'
    );
    expect(html).toContain('<div id="app"></div>');
  });

  it('safely serializes multiple initial state blocks', () => {
    const webview = {
      cspSource: 'webview-source',
      asWebviewUri: ({ fsPath }: { fsPath: string }) => ({
        toString: () => fsPath
      })
    };

    const html = getReactWebviewHtml(webview as never, 'app.js', {
      'lentille-context': { title: '</script><script>alert(1)</script>' },
      'luogu-tags': [{ name: 'tag' }]
    });

    expect(html).not.toContain('</script><script>alert(1)</script>');
    expect(html).toContain(
      '{"title":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}'
    );
    expect(html).toContain(
      '<script type="application/json" id="luogu-tags">[{"name":"tag"}]</script>'
    );
  });
});
