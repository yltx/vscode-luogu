const { default: React, useEffect, useState } = await import('react');
const { FontAwesomeIcon } = await import('@fortawesome/react-fontawesome');
const { faPaperPlane } = await import('@fortawesome/free-solid-svg-icons');
const { default: send } = await import('@w/webviewRequest');

import {
  VSCodeButton,
  VSCodeDropdown,
  VSCodeOption
} from '@vscode/webview-ui-toolkit/react';

import './submissionControls.css';
import type { ProblemSubmissionContext } from './submissionTypes';
import { resolveDisplayedSubmissionLanguage } from './submissionTypes';

export default function SubmissionControls() {
  const [submissionContext, setSubmissionContext] =
    useState<ProblemSubmissionContext>({ languages: [] });
  const [submissionLanguage, setSubmissionLanguage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void send('getSubmissionContext', undefined).then(setSubmissionContext);
    const listener = (
      event: MessageEvent<{
        type?: string;
        data?: ProblemSubmissionContext;
      }>
    ) => {
      if (event.data.type === 'submissionContextChanged' && event.data.data)
        setSubmissionContext(event.data.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  useEffect(() => {
    setSubmissionLanguage(currentLanguage =>
      resolveDisplayedSubmissionLanguage(submissionContext, currentLanguage)
    );
  }, [submissionContext]);

  const submitCurrentDocument = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await send('submitProblem', { language: submissionLanguage });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="submissionControls">
      <VSCodeButton
        onClick={submitCurrentDocument}
        appearance="primary"
        disabled={submitting}
        title={submissionContext.filePath}
      >
        <div>
          <FontAwesomeIcon icon={faPaperPlane} />{' '}
          {submissionContext.fileName
            ? `提交 ${submissionContext.fileName}`
            : '提交代码'}
        </div>
      </VSCodeButton>
      <VSCodeDropdown
        ariaLabelledby="选择提交语言"
        value={submissionLanguage}
        disabled={submitting || submissionContext.languages.length === 0}
        onChange={event => setSubmissionLanguage(event.target.value)}
      >
        {submissionContext.languages.map(language => (
          <VSCodeOption value={language.label} key={language.label}>
            {language.label}
          </VSCodeOption>
        ))}
      </VSCodeDropdown>
    </div>
  );
}
