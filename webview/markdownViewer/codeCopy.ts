import { icon } from '@fortawesome/fontawesome-svg-core';
import { faCopy } from '@fortawesome/free-solid-svg-icons';

const copyIcon = icon(faCopy).html.join('');

/** Add native copy controls after React inserts the rendered HTML. */
export function installCodeCopyButtons(article: HTMLElement) {
  let disposed = false;
  const cleanups: Array<() => void> = [];
  article.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    if (!code) return;

    pre.classList.add('markdown-code');
    const controls = document.createElement('div');
    controls.className = 'copyButton';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vscode-button vscode-button-icon';
    button.setAttribute('aria-label', '复制代码');
    button.title = '复制代码';
    button.innerHTML = copyIcon;
    controls.append(button);
    const error = document.createElement('span');
    error.setAttribute('role', 'alert');
    error.className = 'markdown-copy-error';

    const reset = () => {
      delete button.dataset.copied;
      button.setAttribute('aria-label', '复制代码');
      button.title = '复制代码';
    };
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(code.textContent ?? '');
        if (disposed) return;
        error.remove();
        button.dataset.copied = 'true';
        button.setAttribute('aria-label', '已复制代码');
        button.title = '已复制代码';
      } catch {
        if (disposed) return;
        error.textContent = '复制失败，请重试';
        controls.append(error);
      }
    };
    button.addEventListener('click', copy);
    button.addEventListener('animationend', reset);
    pre.append(controls);
    cleanups.push(() => {
      button.removeEventListener('click', copy);
      button.removeEventListener('animationend', reset);
      controls.remove();
    });
  });
  return () => {
    disposed = true;
    cleanups.forEach(cleanup => cleanup());
  };
}
