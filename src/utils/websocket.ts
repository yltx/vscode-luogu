import * as vscode from 'vscode';
import WebSocket from 'ws';
import { cookieString } from './workspaceUtils';
import { needLogin } from './uiUtils';

import {
  ClientboundHeartbeatMessage,
  ClientboundJoinResultMessage,
  ClientboundServerBroadcastMessage,
  ServerboundJoinChannelMessage
} from 'luogu-api';

export interface ChannelsType<Channel extends string, Inital, Receive, Send> {
  channel: Channel;
  inital: Inital;
  receive: Receive;
  send: Send;
}
export namespace WebsocketSchema {
  export type RecordTrack = ChannelsType<
    'record.track',
    import('luogu-api').ClientboundInitialRecordStatusMessageData,
    import('luogu-api').ClientboundRecordStatusMessageData,
    never
  >;
}

export const WEBSOCKET_URL = 'wss://ws.luogu.com.cn/ws';

export async function createWebsocket<
  SC extends ChannelsType<string, unknown, unknown, unknown>
>(channel: SC['channel'], channel_param: string) {
  const cookie = await globalThis.luogu.authProvider.cookie();
  if (!cookie.uid) {
    needLogin();
    throw new Error('未登录');
  }
  const ws = new WebSocket(WEBSOCKET_URL, {
    headers: {
      cookie: cookieString(cookie)
    },
    timeout: 6000
  });
  const ev = new vscode.EventEmitter<
    | { type: 'receive'; data: SC['receive'] }
    | { type: 'close' }
    | { type: 'error'; data: Error }
  >();
  return new Promise<{
    data: SC['inital'];
    event: typeof ev;
    close: () => void;
    send: (data: SC['send']) => Promise<void>;
    dispose: () => void;
  }>((resolve, reject) => {
    let settled = false;
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      clearTimeout(handshakeTimeout);
      ws.close();
      ev.dispose();
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(handshakeTimeout);
      reject(error);
    };
    const handshakeTimeout = setTimeout(
      () =>
        fail(
          new Error(
            'Websocket did not receive handshake response when join channel ' +
              channel
          )
        ),
      6000
    );
    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          type: 'join_channel',
          channel,
          channel_param
        } satisfies ServerboundJoinChannelMessage),
        err => {
          if (err) fail(err);
        }
      );
    })
      .on('message', str => {
        const dat = JSON.parse(str.toString()) as
          | ClientboundJoinResultMessage<SC['inital']>
          | (ClientboundServerBroadcastMessage & SC['receive'])
          | ClientboundHeartbeatMessage;
        console.debug('Received websocket message', dat);
        if (dat._ws_type === 'join_result') {
          if (settled) return;
          settled = true;
          clearTimeout(handshakeTimeout);
          return void resolve({
            data: dat.welcome_message,
            event: ev,
            close: () => ws.close(),
            send: data =>
              new Promise((resolve, reject) =>
                ws.send(JSON.stringify(data), err =>
                  err ? reject(err) : resolve()
                )
              ),
            dispose
          });
        }
        if (dat._ws_type === 'server_broadcast')
          ev.fire({ type: 'receive', data: dat });
      })
      .on('error', e => (fail(e), ev.fire({ type: 'error', data: e })))
      .on('close', () => ev.fire({ type: 'close' }));
  }).catch(e => {
    ev.dispose();
    ws.close();
    throw e;
  });
}
