const { VSCodeButton, VSCodeTextField } = await import(
  '@vscode/webview-ui-toolkit/react'
);
const { default: send } = await import('@w/webviewRequest');
const { default: React, useEffect, useState } = await import('react');

import '@w/common.css';
import './app.css';

const DefaultCaptchaImage =
  'data:image/svg+xml;base64,' + // 占位
  btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" width="90" height="35">
    <rect x="0" y="0" width="90" height="35" fill="#DDDDDD"/>
    <text
      x="50%" y="50%" fill="#FFFFFF"
      style="dominant-baseline:middle;text-anchor:middle;font-size:16px"
    >
      loading
    </text>
  </svg>
`);

export default function App() {
  const [page, setPage] = useState<'password' | 'captcha'>('password');
  const [need2fa, setNeed2fa] = useState(false);
  return (
    <div className="container">
      <img
        src="https://fecdn.luogu.com.cn/luogu/logo.png"
        className="luogu-logo"
      />
      <div className="motto">在洛谷，享受 Coding 的欢乐！</div>
      <div style={{ display: !need2fa ? 'block' : 'none' }}>
        <div className="menu" role="tablist" aria-label="选择登录方式">
          <button
            className="menu-item"
            onClick={() => setPage('password')}
            role="tab"
            aria-selected={page == 'password'}
          >
            密码登录
          </button>
          <button
            className="menu-item"
            onClick={() => setPage('captcha')}
            role="tab"
            aria-selected={page == 'captcha'}
          >
            Cookie 登录
          </button>
        </div>
        <div style={{ display: page === 'password' ? 'block' : 'none' }}>
          <PasswordLogin set2fa={setNeed2fa} />
        </div>
        <div style={{ display: page === 'captcha' ? 'block' : 'none' }}>
          <CookieLogin />
        </div>
      </div>
      <div style={{ display: need2fa ? 'block' : 'none' }}>
        <Check2fa set2fa={setNeed2fa} />
      </div>
    </div>
  );
}

function PasswordLogin({ set2fa }: { set2fa: (data: boolean) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptchaInput] = useState('');
  const [disableState, setDisableState] = useState(false);
  const [captchaImage, setCaptchaImage] = useState(DefaultCaptchaImage);
  const changeCaptchaImage = async () =>
    setCaptchaImage(
      'data:image/png;base64,' +
        (await send('NeedLoginCaptcha', undefined)).captchaImage
    );
  useEffect(() => void changeCaptchaImage(), []);
  return (
    <form
      role="tabpanel"
      onSubmit={async e => {
        e.preventDefault();
        setDisableState(true);
        const res = await send('PasswordLogin', {
          username,
          password,
          captcha
        });
        setCaptchaInput('');
        await changeCaptchaImage();
        if (res.type === '2fa') set2fa(true);
        setDisableState(false);
      }}
      className="form"
    >
      <div className="form-itemarea">
        <label>用户名</label>
        <div className="form-itemarea-input">
          <VSCodeTextField
            className="form-itemarea-input-textfield"
            name="username"
            placeholder="用户名、用户 ID、手机号或电子邮箱"
            value={username}
            onInput={e => setUsername(e.target.value)}
          />
        </div>
      </div>
      <div className="form-itemarea">
        <label>密码</label>
        <div className="form-itemarea-input">
          <VSCodeTextField
            className="form-itemarea-input-textfield"
            name="password"
            placeholder="密码"
            value={password}
            onInput={e => setPassword(e.target.value)}
            type="password"
          />
        </div>
      </div>
      <div className="form-itemarea">
        <label>验证码</label>
        <div className="form-itemarea-input">
          <VSCodeTextField
            className="form-itemarea-input-textfield"
            name="captcha"
            placeholder="右侧图形验证码"
            value={captcha}
            onInput={e => setCaptchaInput(e.target.value)}
          />
          <a href="" onClick={() => changeCaptchaImage()}>
            <img src={captchaImage} alt="captcha" className="captcha" />
          </a>
        </div>
      </div>
      <VSCodeButton type="submit" className="submit" disabled={disableState}>
        登录
      </VSCodeButton>
    </form>
  );
}
function CookieLogin() {
  const [uid, setUID] = useState(''),
    [clientID, setClientID] = useState('');
  const [disableState, setDisableState] = useState(false);
  return (
    <form
      role="tabpanel"
      onSubmit={async e => {
        e.preventDefault();
        setDisableState(true);
        await send('CookieLogin', {
          uid: +uid,
          clientID
        });
        setDisableState(false);
      }}
      className="form"
    >
      <div className="form-itemarea">
        <label>用户 ID</label>
        <div className="form-itemarea-input">
          <VSCodeTextField
            className="form-itemarea-input-textfield"
            name="uid"
            placeholder="Cookie 中 _uid 字段"
            value={uid}
            onInput={e => setUID(e.target.value)}
          />
        </div>
      </div>
      <div className="form-itemarea">
        <label>Client ID</label>
        <div className="form-itemarea-input">
          <VSCodeTextField
            className="form-itemarea-input-textfield"
            name="clientID"
            placeholder="Cookie 中 __client_id 字段"
            value={clientID}
            onInput={e => setClientID(e.target.value)}
          />
        </div>
      </div>
      <VSCodeButton type="submit" className="submit" disabled={disableState}>
        登录
      </VSCodeButton>
    </form>
  );
}

function Check2fa({ set2fa }: { set2fa: (data: boolean) => void }) {
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<'totp' | 'mail'>('totp');
  const [captcha, setCaptchaInput] = useState('');
  const [disableState, setDisableState] = useState(false);
  const [captchaImage, setCaptchaImage] = useState(DefaultCaptchaImage);
  const changeCaptchaImage = async () =>
    setCaptchaImage(
      'data:image/png;base64,' +
        (await send('Need2faCaptcha', undefined)).captchaImage
    );
  useEffect(() => void changeCaptchaImage(), []);
  return (
    <>
      <p>
        {method === 'totp'
          ? '请使用验证器中的动态验证码解锁您的账户。'
          : '请先发送邮箱验证码，再使用收到的验证码解锁账户。'}
      </p>
      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        <VSCodeButton
          appearance={method === 'totp' ? 'primary' : 'secondary'}
          onClick={() => {
            setMethod('totp');
            setCode('');
          }}
        >
          验证器验证码
        </VSCodeButton>
        <VSCodeButton
          appearance={method === 'mail' ? 'primary' : 'secondary'}
          onClick={() => {
            setMethod('mail');
            setCode('');
          }}
        >
          邮箱验证码
        </VSCodeButton>
      </div>
      {method === 'mail' && (
        <form
          onSubmit={async e => {
            e.preventDefault();
            setDisableState(true);
            await send('SendMailCode', { captcha });
            setDisableState(false);
            changeCaptchaImage();
          }}
          className="form"
        >
          <div className="form-itemarea">
            <div className="form-itemarea-input">
              <VSCodeTextField
                className="form-itemarea-input-textfield"
                name="captcha"
                placeholder="右侧图形验证码"
                value={captcha}
                onInput={e => setCaptchaInput(e.target.value)}
              />
              <a href="" onClick={() => changeCaptchaImage()}>
                <img src={captchaImage} alt="captcha" className="captcha" />
              </a>
            </div>
          </div>
          <VSCodeButton
            type="submit"
            className="submit"
            disabled={disableState}
          >
            发送邮箱验证码
          </VSCodeButton>
        </form>
      )}
      <br />
      <form
        onSubmit={async e => {
          e.preventDefault();
          setDisableState(true);
          await send('2fa', { code, type: method });
          setDisableState(false);
        }}
        className="form"
      >
        <div className="form-itemarea">
          <label>{method === 'totp' ? '动态验证码' : '邮箱验证码'}</label>
          <div className="form-itemarea-input">
            <VSCodeTextField
              className="form-itemarea-input-textfield"
              name="code"
              value={code}
              onInput={e => setCode(e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <VSCodeButton
            className="submit"
            disabled={disableState}
            appearance="secondary"
            onClick={async () => {
              await send('clearLoginCookie', undefined);
              setCode(''), set2fa(false), changeCaptchaImage();
            }}
            style={{ marginRight: 5 }}
          >
            返回
          </VSCodeButton>
          <VSCodeButton
            type="submit"
            className="submit"
            disabled={disableState}
            style={{ marginLeft: 5 }}
          >
            解锁
          </VSCodeButton>
        </div>
      </form>
    </>
  );
}
