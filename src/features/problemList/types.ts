export type ProblemListFilters = {
  page: number;
  keyword: string;
  type: string;
  difficulty: number | null;
  tags: number[];
};

export type ProblemListItem = {
  pid: string;
  type: string;
  name: string;
  difficulty: number;
  tags: number[];
  totalSubmit: number;
  totalAccepted: number;
  flag: number;
};

export type ProblemList = {
  perPage: number;
  count: number;
  result: ProblemListItem[];
};

export type ProblemListResponse = {
  status?: number;
  code?: number;
  data?: {
    errorMessage?: string;
    problems?: unknown;
  };
  currentData?: {
    errorMessage?: string;
    problems?: unknown;
  };
  errorMessage?: string;
};

export type ProblemListViewData = {
  problems: ProblemList;
  filters: ProblemListFilters;
};
