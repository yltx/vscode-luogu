import _ from 'axios'
import { Cookie, CookieJar } from 'tough-cookie'
import axiosCookieJarSupport from 'axios-cookiejar-support'
import * as vscode from 'vscode'
import { UserStatus } from './shared'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
const luoguJSONName = 'luogu.json';
exports.luoguPath = path.join(os.homedir(), '.luogu');
exports.luoguJSONPath = path.join(exports.luoguPath, luoguJSONName);

export const CSRF_TOKEN_REGEX = /<meta name="csrf-token" content="(.*)">/

export namespace API {
  export const baseURL = 'https://www.luogu.com.cn'
  export const apiURL = '/api'
  export const cookieDomain = 'luogu.com.cn'
  // export const SEARCH_PROBLEM = (pid: string) => `${apiURL}/problem/detail/${pid}`
  export const SEARCH_PROBLEM = (pid: string) => `${baseURL}/problem/${pid}?_contentOnly=1`
  export const CAPTCHA_IMAGE = `${apiURL}/verify/captcha`
  export const LOGIN_ENDPOINT = `${apiURL}/auth/userPassLogin`
  export const LOGIN_REFERER = `${baseURL}/auth/login`
  export const LOGOUT = (uid: number) => `${baseURL}${apiURL}/auth/logout/`;
}

export const jar = new CookieJar();

export const axios = (() => {
  const axios = _.create({
    baseURL: API.baseURL,
    withCredentials: true,
    jar
  })

  const defaults = axios.defaults;
  if (!defaults.transformRequest) {
    defaults.transformRequest = []
  } else if (!(defaults.transformRequest instanceof Array)) {
    defaults.transformRequest = [defaults.transformRequest];
  }
  defaults.transformRequest.push((data, headers) => {
    headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36'
    return data
  })

  return axiosCookieJarSupport(axios)
})()

export const setClientID = async (value: string) => new Promise((resolve, reject) => {
  const cookie = new Cookie({
    key: '__client_id',
    value,
    path: '/',
    domain: API.cookieDomain
  })

  jar.setCookie(cookie, API.baseURL, (err, _) => {
    if (err) {
      reject(err)
    } else {
      resolve()
    }
  })
})

export const setUID = async (value: string) => new Promise((resolve, reject) => {
  const cookie = new Cookie({
    key: '_uid',
    value,
    path: '/',
    domain: API.cookieDomain
  })

  jar.setCookie(cookie, API.baseURL, (err, _) => {
    if (err) {
      reject(err)
    } else {
      resolve()
    }
  })
})

export const getClientID = async (): Promise<string | null> => new Promise((resolve, reject) => {
  jar.getCookies(API.baseURL, (err, cookies) => {
    if (err) {
      reject(err);
    } else {
      let cookie = cookies.find((cookie) => cookie.key === '__client_id');
      resolve(cookie ? cookie.value : null)
    }
  })
})

export const getUID = async (): Promise<string | null> => new Promise((resolve, reject) => {
  jar.getCookies(API.baseURL, (err, cookies) => {
    if (err) {
      reject(err);
    } else {
      let cookie = cookies.find((cookie) => cookie.key === '_uid');
      resolve(cookie ? cookie.value : null)
    }
  })
})

export const csrfToken = async () =>
  axios.get(API.baseURL)
    .then(res => {
      const result = CSRF_TOKEN_REGEX.exec(res.data)
      return result ? result[1].trim() : null
    })

export const captcha = async () =>
  axios.get(API.CAPTCHA_IMAGE, {
    params: {
      '_t': new Date().getTime()
    },
    responseType: 'arraybuffer'
  })
    .then(resp => resp.data ? Buffer.from(resp.data, 'binary') : null)

export const searchProblem = async (pid: string) =>
  axios.get(API.SEARCH_PROBLEM(pid))
    .then(res => res.data.currentData.problem || null)

export const login = async (username: string, password: string, captcha: string) =>
  axios.post(API.LOGIN_ENDPOINT, {
    username,
    password,
    captcha
  }, {
    headers: {
      'X-CSRF-Token': await csrfToken(),
      'Referer': API.LOGIN_REFERER
    }
  }).then(res => res.data || null)

export default axios

const getStatus = async (): Promise<string> =>
  new Promise((resolve, reject) => {
    fs.readFile(luoguJSONName, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.toString());
      }
    })
  })

/**
 * @api 提交题解
 * @async
 * @param {string} id 提交id
 * @param {string} text 代码
 * @param {number} language 选择语言
 * @param {boolean} enableO2 是否启用O2优化
 *
 * @returns {number} 测评id
 */
export async function submitSolution (id: string, text: string, language = 0, enableO2 = false): Promise<any> {
  // if (await getStatus() !== UserStatus.SignedIn.toString()) {
  //   throw Error('您还没有登录账户');
  // }
  const url = `/fe/api/problem/submit/${id}`;
  return axios.post(url, {
    'code': text,
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
    console.error(err)
    throw err
  })
}

export async function fetchResult (rid: number) {
  const url = `${API.baseURL}/record/${rid}?_contentOnly=1`;
  return axios.get(url)
    .then(data => data?.data.currentData)
}

export async function fetchHomepage () {
  const url = `${API.baseURL}/user/1?_contentOnly=1`;
  return axios.get(url)
    .then(data => data?.data)
}

export async function logout (uid: number) {
  const url = `${API.baseURL}${API.apiURL}/auth/logout?uid=${uid}`
  return axios.get(url).then(data => data?.data)
}

export async function getFate () {
  const url = `${API.baseURL}/index/ajax_punch`
  return axios.get(url).then(data => data?.data);
}

export function removeDir (dir: any, cb: any) {
  fs.readdir(dir, function (err, files) {
    next(0)
    function next (index: any) {
      if (index === files.length) {
        return fs.rmdir(dir, cb)
      }
      let newPath = path.join(dir, files[index])
      console.log(newPath)
      fs.stat(newPath, function (err, stat) {
        if (err) {
          console.log(err)
        }
        if (stat.isDirectory()) {
          removeDir(newPath, () => next(index + 1))
        } else {
          fs.unlink(newPath, function (err) {
            if (err) {
              console.error(err)
            }
            next(index + 1)
          })
        }
      })
    }
  })
}
