import { beforeEach, describe, expect, it, vi } from 'vitest';

const showOpenDialog = vi.fn();
const showWarningMessage = vi.fn();
const showInformationMessage = vi.fn();
const stat = vi.fn();
const writeFile = vi.fn();

class FileSystemError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

vi.mock('vscode', () => ({
  window: { showOpenDialog, showWarningMessage, showInformationMessage },
  workspace: { fs: { stat, writeFile } },
  Uri: {
    joinPath: (base: { path: string }, name: string) => ({
      path: `${base.path}/${name}`
    })
  },
  FileSystemError
}));

const { saveDownloadedTestcase } = await import('./recordTestcaseDownload');

describe('saveDownloadedTestcase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stat.mockRejectedValue(new FileSystemError('FileNotFound'));
    writeFile.mockResolvedValue(undefined);
    showInformationMessage.mockResolvedValue(undefined);
  });

  it('does nothing when folder selection is cancelled', async () => {
    showOpenDialog.mockResolvedValue(undefined);

    await expect(
      saveDownloadedTestcase(123, 4, { input: 'input', output: 'output' })
    ).resolves.toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('writes input and output as separate UTF-8 files', async () => {
    showOpenDialog.mockResolvedValue([{ path: '/target' }]);

    await expect(
      saveDownloadedTestcase(123, 4, { input: '输入\n', output: '输出\n' })
    ).resolves.toBe(true);
    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      { path: '/target/R123-testcase-4.in' },
      new TextEncoder().encode('输入\n')
    );
    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      { path: '/target/R123-testcase-4.out' },
      new TextEncoder().encode('输出\n')
    );
  });

  it('does not overwrite existing files without confirmation', async () => {
    showOpenDialog.mockResolvedValue([{ path: '/target' }]);
    stat.mockResolvedValue({});
    showWarningMessage.mockResolvedValue(undefined);

    await expect(
      saveDownloadedTestcase(123, 4, { input: 'input', output: 'output' })
    ).resolves.toBe(false);
    expect(writeFile).not.toHaveBeenCalled();
  });
});
