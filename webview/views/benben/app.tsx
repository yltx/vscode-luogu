import type BenbenData from '@/model/benben';

const { default: React, useState, useRef, useEffect } = await import('react');
const { VSCodeButton, VSCodeProgressRing, VSCodeTextArea } = await import(
  '@w/components/uiToolkit'
);
const { sleep, UserIcon, UserName } = await import('@w/components');
const { default: send } = await import('@w/webviewRequest');
const { default: Md } = await import('../../markdownViewer');
const { default: Time } = await import('@w/components/time');
const { default: ReloadButton } = await import('@w/components/reload');

import '@w/common.css';
import './app.css';

export default function App() {
  const [text, SetText] = useState('');
  const [version, setVersion] = useState(0);
  const reload = () => setVersion(version + 1);
  return (
    <>
      <BenbenEditor reload={reload} text={text} SetText={SetText} />
      <BenbenList key={version} SetText={SetText} reload={reload} />
      <ReloadButton onClick={reload} />
    </>
  );
}
function BenbenEditor({
  reload,
  text,
  SetText
}: {
  reload: () => void;
  text: string;
  SetText: (x: string) => void;
}) {
  const [disabledState, SetDisabledState] = useState(false);
  return (
    <div className="benben-editor">
      <VSCodeTextArea
        className="benben-editor-textarea"
        autofocus
        placeholder="有什么新鲜事告诉大家"
        resize="vertical"
        value={text}
        onInput={e => SetText(e.currentTarget.value)}
        disabled={disabledState}
      />
      <VSCodeButton
        className="benben-editor-submit"
        onClick={async () => {
          SetDisabledState(true);
          await new Promise(resolve => setTimeout(resolve, 1145));
          try {
            await send('BenbenSend', { comment: text });
            reload();
            SetText('');
          } finally {
            SetDisabledState(false);
          }
        }}
        disabled={disabledState}
      >
        发射犇犇
      </VSCodeButton>
    </div>
  );
}
function BenbenBlock({
  data,
  SetText,
  reload
}: {
  data: BenbenData;
  SetText: (x: string) => void;
  reload: () => void;
}) {
  const benbenTextElementRef = useRef<HTMLDivElement>(null);
  return (
    <div className="benben-comment-primary">
      <UserIcon url={data.user.icon} uid={data.user.uid} />
      <div className="benben-comment-main">
        <header className="benben-comment-header">
          <UserName user={data.user} />
          <span className="benben-comment-time">
            &thinsp; at <Time time={data.time} />
          </span>
          <a
            href=""
            className="benben-comment-button"
            onClick={() => {
              SetText(
                ` || @${data.user.name} : ${benbenTextElementRef.current?.innerText || ''}`
              );
            }}
          >
            回复
          </a>
          {data.user.isMe ? (
            <a
              href=""
              className="benben-comment-button"
              onClick={async () => {
                await send('BenbenDelete', {
                  id: data.id
                })
                  .then(reload)
                  .catch();
              }}
            >
              删除
            </a>
          ) : (
            <></>
          )}
        </header>
        <div className="benben-comment-text" ref={benbenTextElementRef}>
          <Md>{data.comment}</Md>
        </div>
      </div>
    </div>
  );
}

function BenbenList({
  SetText,
  reload
}: {
  SetText: (x: string) => void;
  reload: () => void;
}) {
  const [subelement, setSubelement] = useState<React.JSX.Element[]>([]),
    [loadingState, setLoadingState] = useState(false),
    [endState, setEndState] = useState(false);
  const page = useRef(1),
    count = useRef(0),
    loadingIconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false,
      lock = false,
      end = false;
    let requestCDpromise = new Promise<void>(resolve => resolve());
    async function request() {
      if (
        loadingIconRef.current &&
        loadingIconRef.current.getBoundingClientRect().top <
          window.innerHeight + 2 &&
        !lock &&
        !end
      ) {
        lock = true;
        setLoadingState(true);
        await requestCDpromise;

        let tryAgain = false;
        try {
          const res = await send('BenbenUpdate', {
            page: page.current++
          });
          if (ignore) return;
          if (res.length === 0) setEndState(true), (end = true);
          else
            setSubelement(p => [
              ...p,
              ...res.map(item => (
                <BenbenBlock
                  data={item}
                  key={count.current++}
                  SetText={SetText}
                  reload={reload}
                />
              ))
            ]);
        } catch (err) {
          if (err instanceof Error && err.message.includes('429'))
            (tryAgain = true), await sleep(3000 - 1000);
        }
        setLoadingState(false);
        lock = false;
        requestCDpromise = new Promise<void>(resolve =>
          setTimeout(() => resolve(), 1000)
        );
        if (tryAgain) request();
      }
    }

    window.addEventListener('scroll', request);
    window.addEventListener('resize', request);
    request();

    return () => {
      ignore = true;
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
    };
  }, [SetText, reload]);

  useEffect(() => {}, [loadingState]);

  return (
    <div className="benben-main">
      <div className="benben-list">{subelement}</div>
      <div ref={loadingIconRef} className="benben-loading">
        {!endState && <VSCodeProgressRing className="benben-loadingicon" />}
      </div>
    </div>
  );
}
