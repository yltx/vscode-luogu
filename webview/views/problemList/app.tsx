const { default: React } = await import('react');
const { ProblemDifficultyTag, ProblemTag, Spinner } = await import(
  '@w/components'
);
const { default: Pagination } = await import('@w/components/pagination');
const { default: send } = await import('@w/webviewRequest');
const { VSCodeButton, VSCodeDropdown, VSCodeOption, VSCodeTextField } =
  await import('@w/components/uiToolkit');
const { difficultyName, problemset } = await import('@/utils/shared');
import type {
  ProblemList,
  ProblemListFilters,
  ProblemListViewData
} from '@/features/problemList/types';
import '@w/common.css';
import './app.css';

type TagOption = { id: number; name: string; color: string };

const tagOptions = (() => {
  const text = document.getElementById('luogu-tags')?.innerText;
  return text ? (JSON.parse(text) as TagOption[]) : [];
})();

export default function App({ children }: { children: ProblemListViewData }) {
  const [filters, setFilters] = React.useState(children.filters);
  const [draft, setDraft] = React.useState(children.filters);
  const [problems, setProblems] = React.useState(children.problems);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const requestId = React.useRef(0);

  const search = async (next: ProblemListFilters) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(undefined);
    try {
      const result = await send('ProblemListSearch', next);
      if (currentRequest !== requestId.current) return;
      setFilters(next);
      setDraft(next);
      setProblems(result);
    } catch (reason) {
      if (currentRequest !== requestId.current) return;
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void search({ ...draft, page: 1 });
  };

  return (
    <main>
      <header>
        <div>
          <p className="eyebrow">PROBLEM EXPLORER</p>
          <h1>洛谷题库</h1>
          <p className="summary">
            当前筛选共 {problems.count.toLocaleString()} 道题
          </p>
        </div>
        {loading && <Spinner size={24} />}
      </header>
      <form onSubmit={submit} className="filters">
        <label className="keyword-field">
          <span>关键词 / 题号</span>
          <VSCodeTextField
            value={draft.keyword}
            placeholder="例如 P1000、动态规划"
            onInput={event =>
              setDraft({
                ...draft,
                keyword: event.currentTarget.value
              })
            }
          />
        </label>
        <label>
          <span>题库</span>
          <VSCodeDropdown
            value={draft.type}
            onChange={event =>
              setDraft({
                ...draft,
                type: event.currentTarget.value
              })
            }
          >
            <VSCodeOption value="">全部题库</VSCodeOption>
            {Object.entries(problemset)
              .filter(([, value]) => typeof value === 'string')
              .map(([name, value]) => (
                <VSCodeOption key={String(value)} value={String(value)}>
                  {name}
                </VSCodeOption>
              ))}
          </VSCodeDropdown>
        </label>
        <label>
          <span>难度</span>
          <VSCodeDropdown
            value={draft.difficulty === null ? '' : String(draft.difficulty)}
            onChange={event => {
              const value = event.currentTarget.value;
              setDraft({
                ...draft,
                difficulty: value === '' ? null : Number(value)
              });
            }}
          >
            <VSCodeOption value="">全部难度</VSCodeOption>
            {difficultyName.slice(1).map((name, index) => {
              const value = index + 1;
              return (
                <VSCodeOption key={value} value={String(value)}>
                  {name}
                </VSCodeOption>
              );
            })}
          </VSCodeDropdown>
        </label>
        <label className="tag-field">
          <span>标签</span>
          <select
            multiple
            value={draft.tags.map(String)}
            onChange={event =>
              setDraft({
                ...draft,
                tags: Array.from(event.target.selectedOptions, option =>
                  Number(option.value)
                )
              })
            }
          >
            {tagOptions.map(tag => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <small>按住 Ctrl / Cmd 可多选</small>
        </label>
        <div className="filter-actions">
          <VSCodeButton type="submit" disabled={loading}>
            搜索
          </VSCodeButton>
          <VSCodeButton
            type="button"
            appearance="secondary"
            disabled={loading}
            onClick={() =>
              void search({
                page: 1,
                keyword: '',
                type: '',
                difficulty: null,
                tags: []
              })
            }
          >
            重置
          </VSCodeButton>
        </div>
      </form>
      {draft.tags.length > 0 && (
        <div className="selected-tags">
          {draft.tags.map(id => (
            <button
              type="button"
              key={id}
              onClick={() =>
                setDraft({
                  ...draft,
                  tags: draft.tags.filter(tag => tag !== id)
                })
              }
            >
              <ProblemTag tag={id} /> ×
            </button>
          ))}
        </div>
      )}
      {error && <div className="error">{error}</div>}
      <ProblemTable problems={problems} loading={loading} />
      <Pagination
        className="problem-pagination"
        current={filters.page}
        total={Math.max(1, Math.ceil(problems.count / problems.perPage))}
        onChange={page => {
          if (!loading) void search({ ...filters, page });
        }}
      />
    </main>
  );
}

function ProblemTable({
  problems,
  loading
}: {
  problems: ProblemList;
  loading: boolean;
}) {
  if (problems.result.length === 0)
    return <div className="empty">没有符合当前筛选条件的题目。</div>;
  return (
    <div className={`problem-table ${loading ? 'loading' : ''}`}>
      <div className="problem-row problem-header" aria-hidden="true">
        <span>题目</span>
        <span>难度</span>
        <span>标签</span>
        <span>通过率</span>
      </div>
      {problems.result.map(problem => {
        const rate =
          problem.totalSubmit === 0
            ? 0
            : (problem.totalAccepted / problem.totalSubmit) * 100;
        return (
          <button
            type="button"
            className="problem-row problem-item"
            key={problem.pid}
            aria-label={`打开题目 ${problem.pid} ${problem.name}`}
            onClick={() =>
              void send('OpenProblemFromList', { pid: problem.pid })
            }
          >
            <span className="problem-title">
              <strong>{problem.pid}</strong>
              <span>{problem.name}</span>
            </span>
            <span>
              <ProblemDifficultyTag difficulty={problem.difficulty} />
            </span>
            <span className="problem-tags">
              {problem.tags.map(tag => (
                <ProblemTag key={tag} tag={tag} />
              ))}
            </span>
            <span className="acceptance">
              <strong>{rate.toFixed(1)}%</strong>
              <small>
                {problem.totalAccepted.toLocaleString()} /{' '}
                {problem.totalSubmit.toLocaleString()}
              </small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
