import type { ProblemData } from 'luogu-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestDocument = {
  fileName: string;
  isClosed: boolean;
};

const mocks = vi.hoisted(() => ({
  activeTextEditor: undefined as { document: TestDocument } | undefined,
  activeEditorListener: undefined as
    | ((editor: { document: TestDocument } | undefined) => void)
    | undefined,
  closeDocumentListener: undefined as
    | ((document: TestDocument) => void)
    | undefined,
  getSubmissionContext: vi.fn(),
  selectOpenDocument: vi.fn(),
  submitDocument: vi.fn(),
  executeCommand: vi.fn(),
  postMessage: vi.fn(() => Promise.resolve(true))
}));

vi.mock('@/features/submit', () => ({
  getSubmissionContext: mocks.getSubmissionContext,
  selectOpenDocument: mocks.selectOpenDocument,
  submitDocument: mocks.submitDocument
}));

vi.mock('vscode', () => ({
  commands: { executeCommand: mocks.executeCommand },
  window: {
    get activeTextEditor() {
      return mocks.activeTextEditor;
    },
    onDidChangeActiveTextEditor: vi.fn(
      (listener: typeof mocks.activeEditorListener) => {
        mocks.activeEditorListener = listener;
        return { dispose: vi.fn() };
      }
    )
  },
  workspace: {
    onDidCloseTextDocument: vi.fn(
      (listener: typeof mocks.closeDocumentListener) => {
        mocks.closeDocumentListener = listener;
        return { dispose: vi.fn() };
      }
    )
  }
}));

const { createSubmissionControls } = await import('./submissionControls');

const cpp17 = { label: 'C++17', id: 52, O2: true as const };
const cpp20 = { label: 'C++20', id: 73, O2: true as const };
const python3 = { label: 'Python 3', id: 7 };

const document = (fileName: string): TestDocument => ({
  fileName,
  isClosed: false
});

const createControls = () => {
  const panel = { webview: { postMessage: mocks.postMessage } };
  const data = {
    problem: { pid: 'P1000' },
    lastLanguage: cpp17.id
  } as ProblemData;
  return createSubmissionControls(panel as never, data);
};

describe('problem submission controls', () => {
  beforeEach(() => {
    mocks.activeTextEditor = undefined;
    mocks.activeEditorListener = undefined;
    mocks.closeDocumentListener = undefined;
    mocks.getSubmissionContext.mockReset();
    mocks.selectOpenDocument.mockReset();
    mocks.submitDocument.mockReset().mockResolvedValue(true);
    mocks.executeCommand.mockReset();
    mocks.postMessage.mockClear();
    mocks.getSubmissionContext.mockImplementation(
      (selectedDocument?: TestDocument) => {
        if (!selectedDocument || selectedDocument.isClosed)
          return {
            languages: [cpp17, cpp20, python3],
            defaultLanguage: cpp17.label
          };
        if (selectedDocument.fileName.endsWith('.py'))
          return {
            fileName: selectedDocument.fileName,
            filePath: selectedDocument.fileName,
            languages: [python3],
            defaultLanguage: python3.label
          };
        return {
          fileName: selectedDocument.fileName,
          filePath: selectedDocument.fileName,
          languages: [cpp17, cpp20],
          defaultLanguage: cpp17.label
        };
      }
    );
  });

  it('recomputes the language after selecting a different file type', async () => {
    const pythonDocument = document('main.py');
    mocks.selectOpenDocument.mockResolvedValueOnce({
      document: pythonDocument
    });
    const controls = createControls();

    await expect(
      controls.handlers.submitProblem({ language: cpp17.label })
    ).resolves.toBe(true);

    expect(mocks.submitDocument).toHaveBeenCalledWith(
      { pid: 'P1000', cid: undefined },
      pythonDocument,
      python3
    );
    expect(mocks.postMessage).toHaveBeenLastCalledWith({
      type: 'submissionContextChanged',
      data: expect.objectContaining({
        fileName: 'main.py',
        languages: [python3],
        defaultLanguage: python3.label
      })
    });
  });

  it('keeps a manually selected language when it is valid for the file', async () => {
    const cppDocument = document('main.cpp');
    mocks.activeTextEditor = { document: cppDocument };
    const controls = createControls();

    await controls.handlers.submitProblem({ language: cpp20.label });

    expect(mocks.submitDocument).toHaveBeenCalledWith(
      { pid: 'P1000', cid: undefined },
      cppDocument,
      cpp20
    );
    expect(mocks.postMessage).toHaveBeenLastCalledWith({
      type: 'submissionContextChanged',
      data: expect.objectContaining({ defaultLanguage: cpp20.label })
    });
  });

  it('publishes a recalculated context when the active file changes', () => {
    const controls = createControls();
    const pythonDocument = document('next.py');

    mocks.activeEditorListener?.({ document: pythonDocument });

    expect(mocks.postMessage).toHaveBeenLastCalledWith({
      type: 'submissionContextChanged',
      data: expect.objectContaining({
        fileName: 'next.py',
        languages: [python3],
        defaultLanguage: python3.label
      })
    });
    controls.dispose();
  });

  it('publishes the no-file context when the selected document closes', () => {
    const cppDocument = document('main.cpp');
    mocks.activeTextEditor = { document: cppDocument };
    const controls = createControls();
    cppDocument.isClosed = true;

    mocks.closeDocumentListener?.(cppDocument);

    expect(mocks.postMessage).toHaveBeenLastCalledWith({
      type: 'submissionContextChanged',
      data: {
        languages: [cpp17, cpp20, python3],
        defaultLanguage: cpp17.label
      }
    });
    controls.dispose();
  });

  it('keeps the last code file while focus moves to the problem webview', () => {
    const cppDocument = document('main.cpp');
    mocks.activeTextEditor = { document: cppDocument };
    const controls = createControls();

    mocks.activeEditorListener?.(undefined);

    expect(mocks.postMessage).not.toHaveBeenCalled();
    expect(controls.handlers.getSubmissionContext().fileName).toBe('main.cpp');
    controls.dispose();
  });

  it('does not submit when file selection is cancelled', async () => {
    mocks.selectOpenDocument.mockResolvedValueOnce(undefined);
    const controls = createControls();

    await expect(
      controls.handlers.submitProblem({ language: cpp17.label })
    ).resolves.toBe(false);

    expect(mocks.submitDocument).not.toHaveBeenCalled();
    expect(mocks.executeCommand).not.toHaveBeenCalled();
  });

  it('does not submit a document that closed before submission', async () => {
    const closedDocument = document('old.cpp');
    const replacementDocument = document('replacement.py');
    mocks.activeTextEditor = { document: closedDocument };
    mocks.selectOpenDocument.mockResolvedValueOnce({
      document: replacementDocument
    });
    const controls = createControls();
    closedDocument.isClosed = true;

    await controls.handlers.submitProblem({ language: cpp17.label });

    expect(mocks.submitDocument).toHaveBeenCalledWith(
      { pid: 'P1000', cid: undefined },
      replacementDocument,
      python3
    );
  });
});
