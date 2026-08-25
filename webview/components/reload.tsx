const { default: React } = await import('react');
const { FontAwesomeIcon } = await import('@fortawesome/react-fontawesome');
const { faRotateRight } = await import('@fortawesome/free-solid-svg-icons');
const { VSCodeButton } = await import('@w/components/uiToolkit');

import './reload.css';

const ReloadButton = ({
  disabled,
  onClick
}: {
  disabled?: boolean;
  onClick?: () => void;
}) => (
  <VSCodeButton
    className="reload"
    appearance="icon"
    disabled={disabled}
    onClick={onClick}
  >
    <FontAwesomeIcon icon={faRotateRight} spin={disabled} />
  </VSCodeButton>
);
export default ReloadButton;
