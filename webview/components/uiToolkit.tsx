import React from 'react';
/* eslint-disable react/prop-types */

import './uiToolkit.css';

type ButtonAppearance = 'primary' | 'secondary' | 'icon';

export type VSCodeButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    appearance?: ButtonAppearance;
  };

export function VSCodeButton({
  appearance = 'primary',
  className,
  type = 'button',
  ...props
}: VSCodeButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={joinClassNames(
        'vscode-button',
        `vscode-button-${appearance}`,
        className
      )}
    />
  );
}

type LegacyAutofocus = {
  autofocus?: boolean;
};

export type VSCodeTextFieldProps = React.InputHTMLAttributes<HTMLInputElement> &
  LegacyAutofocus;

export function VSCodeTextField({
  autofocus,
  autoFocus,
  className,
  type = 'text',
  ...props
}: VSCodeTextFieldProps) {
  return (
    <input
      {...props}
      type={type}
      autoFocus={autoFocus ?? autofocus}
      className={joinClassNames('vscode-input', className)}
    />
  );
}

export type VSCodeTextAreaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> &
    LegacyAutofocus & {
      resize?: React.CSSProperties['resize'];
    };

export function VSCodeTextArea({
  autofocus,
  autoFocus,
  className,
  resize,
  style,
  ...props
}: VSCodeTextAreaProps) {
  return (
    <textarea
      {...props}
      autoFocus={autoFocus ?? autofocus}
      className={joinClassNames('vscode-input', 'vscode-textarea', className)}
      style={{ ...style, resize }}
    />
  );
}

export type VSCodeDropdownProps =
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    ariaLabelledby?: string;
  };

export function VSCodeDropdown({
  ariaLabelledby,
  className,
  ...props
}: VSCodeDropdownProps) {
  return (
    <select
      {...props}
      aria-label={props['aria-label'] ?? ariaLabelledby}
      className={joinClassNames('vscode-input', 'vscode-dropdown', className)}
    />
  );
}

export function VSCodeOption(
  props: React.OptionHTMLAttributes<HTMLOptionElement>
) {
  return <option {...props} />;
}

export type VSCodeCheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
>;

export function VSCodeCheckbox({
  children,
  className,
  ...props
}: VSCodeCheckboxProps) {
  return (
    <label className={joinClassNames('vscode-checkbox', className)}>
      <input {...props} type="checkbox" />
      <span>{children}</span>
    </label>
  );
}

export function VSCodeProgressRing({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={joinClassNames('vscode-progress-ring', className)}
      role="progressbar"
      aria-label={props['aria-label'] ?? 'Loading'}
    />
  );
}

function joinClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(' ');
}
