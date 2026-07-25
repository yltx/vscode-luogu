export type ProblemSubmissionContext = {
  fileName?: string;
  filePath?: string;
  languages: {
    label: string;
    id: number;
    O2?: true;
  }[];
  defaultLanguage?: string;
};
