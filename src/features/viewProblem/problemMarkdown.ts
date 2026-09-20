import type { ProblemData, ProblemContents } from 'luogu-api';

const normalizeMarkdown = (value: string) => value.trim();

const fencedCodeBlock = (value: string) =>
  `\`\`\`\n${value.replace(/`/g, '\\`')}\n\`\`\``;

const addSection = (
  sections: string[],
  title: string,
  content: string | null | undefined,
  required = false
) => {
  const normalizedContent = content ? normalizeMarkdown(content) : '';
  if (!normalizedContent && !required) return;
  sections.push(`## ${title}`, normalizedContent || '无');
};

const getProblemContent = (data: ProblemData, locale: string) =>
  data.translations[locale] || data.problem.content;

export const buildProblemMarkdown = (data: ProblemData, locale: string) => {
  const content: ProblemContents = getProblemContent(data, locale);
  const title = content.name?.trim() || data.problem.title;
  const sections = [`# ${data.problem.pid} ${title}`];

  addSection(sections, '题目背景', content.background);
  addSection(sections, '题目描述', content.description, true);
  addSection(sections, '输入格式', content.formatI, true);
  addSection(sections, '输出格式', content.formatO, true);

  if (data.problem.samples?.length) {
    data.problem.samples.forEach(([input, output], index) => {
      const sampleNumber = index + 1;
      sections.push(
        `## 输入输出样例 #${sampleNumber}`,
        `### 输入 #${sampleNumber}`,
        fencedCodeBlock(input),
        `### 输出 #${sampleNumber}`,
        fencedCodeBlock(output)
      );
    });
  }

  addSection(sections, '说明/提示', content.hint);
  return sections
    .filter(Boolean)
    .join('\n\n')
    .replace(/^::anti-ai\[(.+)\]$/gm, '$1');
};
