import { describe, expect, it, vi } from 'vitest';
import type HistoryItem from './historyItem';

class EventEmitter<T> {
  readonly event = vi.fn();
  fire = vi.fn<(event?: T) => void>();
  dispose = vi.fn();
}

vi.mock('vscode', () => ({
  EventEmitter,
  workspace: {
    getConfiguration: () => ({ get: () => 256 })
  },
  ThemeIcon: class {},
  MarkdownString: class {},
  Uri: { from: vi.fn() }
}));

const { default: HistoryTreeviewProvider } = await import('./treeviewProvider');

const problem = (pid: string): HistoryItem => ({
  type: 'problem',
  pid,
  title: `Problem ${pid}`
});

describe('historyTreeviewProvider storage updates', () => {
  it('serializes concurrent additions without losing items', async () => {
    let stored: HistoryItem[] = [];
    const provider = new HistoryTreeviewProvider(
      () => [...stored],
      async items => {
        await Promise.resolve();
        stored = [...items];
      }
    );

    await Promise.all([
      provider.addItem(problem('P1000')),
      provider.addItem(problem('P1001'))
    ]);

    expect(stored.map(item => item.type === 'problem' && item.pid)).toEqual([
      'P1000',
      'P1001'
    ]);
  });

  it('orders clear operations with pending additions', async () => {
    let stored: HistoryItem[] = [];
    const provider = new HistoryTreeviewProvider(
      () => [...stored],
      async items => {
        await Promise.resolve();
        stored = [...items];
      }
    );

    const addition = provider.addItem(problem('P1000'));
    const clearing = provider.clear();
    await Promise.all([addition, clearing]);

    expect(stored).toEqual([]);
  });
});
