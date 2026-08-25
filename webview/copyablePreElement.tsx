const { default: React, useState } = await import('react');
const { FontAwesomeIcon } = await import('@fortawesome/react-fontawesome');
const { VSCodeButton } = await import('@w/components/uiToolkit');
const { createRoot } = await import('react-dom/client');
const { faCopy } = await import('@fortawesome/free-solid-svg-icons');

class CopyablePreElement extends HTMLPreElement {
  buttonDiv?: HTMLDivElement;
  reactRoot?: import('react-dom/client').Root;
  constructor() {
    super();
  }
  connectedCallback() {
    this.buttonDiv = document.createElement('div');
    this.buttonDiv.className = 'copyButton';
    this.insertBefore(this.buttonDiv, this.firstElementChild);

    const Compose = () => {
      const [animationType, setAnimationType] = useState(false);
      const copy = async () => {
        const text = this.childNodes[1].textContent ?? '';
        await navigator.clipboard.writeText(text);
        setAnimationType(true);
      };
      return (
        <VSCodeButton
          appearance="icon"
          onClick={copy}
          aria-label="Copy"
          onAnimationEnd={() => setAnimationType(false)}
        >
          <FontAwesomeIcon
            className={animationType ? 'animate' : undefined}
            icon={faCopy}
          />
        </VSCodeButton>
      );
    };
    (this.reactRoot = createRoot(this.buttonDiv)).render(<Compose />);
  }
  disconnectedCallback() {
    this.reactRoot?.unmount();
    if (this.buttonDiv) this.removeChild(this.buttonDiv);
  }
}
customElements.define('copyable-pre', CopyablePreElement, { extends: 'pre' });

export default {};
