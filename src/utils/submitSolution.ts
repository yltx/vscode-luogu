import { axios, csrfToken, API } from '@/utils/api';
import * as vscode from 'vscode'
/**
 * @api 提交题解
 * @async
 * @param {string} id 提交id
 * @param {string} code 代码
 * @param {number} language 选择语言
 * @param {boolean} enableO2 是否启用O2优化
 *
 * @returns {number} 测评id
 */
export async function submitSolution (id: string, code: string, language = 0, enableO2 = false): Promise<any> {
  const url = `/fe/api/problem/submit/${id}`;
  return axios.post(url, {
    'code': code,
    'lang': language,
    'enableO2': enableO2,
    'verify': ''
  }, {
    headers: {
      'X-CSRF-Token': await csrfToken(),
      'Referer': `${API.baseURL}/problem/${id}`
    }
  }).then(res => {
    if (res.status === 200) {
      return res.data.rid;
    } else if (res.status === 401) {
      vscode.window.showErrorMessage('您没有登录');
      throw Error('您没有登录');
    } else {
      throw res.data;
    }
  }).catch(err => {
    if (err.response) {
      throw err.response.data;
    } else if (err.request) {
      throw new Error('请求超时，请重试')
    } else {
      throw err;
    }
  }).catch(err => {
    console.error(err)
    throw err
  });
}
