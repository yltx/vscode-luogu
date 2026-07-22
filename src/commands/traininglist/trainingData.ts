export interface TrainingCategory {
  key: string;
  name: string;
}

interface TrainingListData {
  categories?: TrainingCategory[];
  acceptedCounts?: Record<number, number> | null;
  acCounts?: Record<number, number> | number[] | null;
}

export const getTrainingCategories = (
  data: TrainingListData
): TrainingCategory[] => {
  if (!data.categories?.length)
    return [
      { key: 'official', name: '官方精选' },
      { key: 'select', name: '用户分享' }
    ];
  return [...data.categories, { key: 'select', name: '用户分享' }];
};

export const getAcceptedCount = (data: TrainingListData, id: number) => {
  const counts = data.acceptedCounts ?? data.acCounts;
  return counts && !Array.isArray(counts) ? counts[id] ?? 0 : 0;
};

export const normalizeTrainingProblems = <T>(
  problems: Array<T | { problem: T }>
): T[] =>
  problems.map(item =>
    'problem' in Object(item) ? (item as { problem: T }).problem : (item as T)
  );
