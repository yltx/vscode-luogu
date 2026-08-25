const { default: React } = await import('react');
const { createRoot } = await import('react-dom/client');
import App from './app';
import type { ProblemListViewData } from '@/features/problemList/types';

createRoot(document.getElementById('app')!).render(
  <App>
    {
      JSON.parse(
        document.getElementById('lentille-context')!.innerText
      ) as ProblemListViewData
    }
  </App>
);
