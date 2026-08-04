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

export function resolveDisplayedSubmissionLanguage(
  context: ProblemSubmissionContext,
  currentLanguage: string
) {
  if (context.languages.some(language => language.label === currentLanguage))
    return currentLanguage;
  if (
    context.languages.some(
      language => language.label === context.defaultLanguage
    )
  )
    return context.defaultLanguage!;
  return context.languages[0]?.label ?? '';
}
