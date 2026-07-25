const { default: React, useEffect, useState } = await import('react');
const { VSCodeButton } = await import('@vscode/webview-ui-toolkit/react');
const { default: send } = await import('@w/webviewRequest');

import type { ContestProblemNavigation as NavigationData } from '@/features/viewProblem/contestProblemNavigation';
import type { ProblemData } from 'luogu-api';

import './contestProblemNavigation.css';

function formatContestProblemIndex(index: number) {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    value--;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

export default function ContestProblemNavigation({
  data,
  onProblemChange
}: {
  data: ProblemData;
  onProblemChange: (data: ProblemData) => void;
}) {
  const [navigation, setNavigation] = useState<NavigationData | null>(null);

  useEffect(() => {
    if (!data.contest) return;
    void send('getContestProblemNavigation', undefined)
      .then(setNavigation)
      .catch(() => setNavigation(null));
  }, [data.contest?.id]);

  if (!navigation || navigation.problems.length === 0) return null;

  return (
    <nav
      className="contestProblemNavigation"
      aria-label={navigation.contestName}
    >
      {navigation.problems.map((problem, index) => {
        const isCurrentProblem = problem.pid === data.problem.pid;
        const tooltip =
          `${problem.pid} [${navigation.contestName}] ` + problem.title;
        return (
          <VSCodeButton
            key={problem.pid}
            appearance={isCurrentProblem ? 'primary' : 'secondary'}
            aria-current={isCurrentProblem ? 'page' : undefined}
            aria-label={tooltip}
            title={tooltip}
            onClick={
              isCurrentProblem
                ? undefined
                : () => {
                    void send('openContestProblem', { pid: problem.pid })
                      .then(problemData => {
                        onProblemChange(problemData);
                        window.scrollTo({ top: 0 });
                      })
                      .catch(() => {});
                  }
            }
          >
            {formatContestProblemIndex(index)}
          </VSCodeButton>
        );
      })}
    </nav>
  );
}
