import _ from 'axios'
import { Cookie, CookieJar } from 'tough-cookie'
import axiosCookieJarSupport from 'axios-cookiejar-support'
export const jar = new CookieJar();

export namespace API {
    export const baseURL = 'https://www.luogu.com.cn'
    export const apiURL = '/api'
    export const cookieDomain = 'luogu.com.cn'
    // export const SEARCH_PROBLEM = (pid: string) => `${apiURL}/problem/detail/${pid}`
    export const SEARCH_PROBLEM = (pid: string) => `/problem/${pid}?_contentOnly=1`
    export const SEARCH_SOLUTION = (pid: string, page: number) => `/problem/solution/${pid}?page=${page}&_contentOnly=1`
    export const CAPTCHA_IMAGE = `${apiURL}/verify/captcha`
    export const CONTEST = (cid: string) => `/contest/${cid}?_contentOnly=1`
    export const LOGIN_ENDPOINT = `${apiURL}/auth/userPassLogin`
    export const LOGIN_REFERER = `${baseURL}/auth/login`
    export const LOGOUT = `${apiURL}/auth/logout`;
    export const FATE = `/index/ajax_punch`;
    export const BENBEN = (mode: string, page: number) => `/feed/${mode}?page=${page}`;
    export const BENBEN_POST = `${apiURL}/feed/postBenben`;
    export const BENBEN_DELETE = (id: string) => `${apiURL}/feed/delete/${id}`;
  }

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
export const getContest = async (cid: string) =>
  axios.get("https://www.luogu.com.cn/contest/6724?_contentOnly=1")
    .then(res => res.data).then(async res =>{
      console.log(res)
    }).catch(err => {throw err})
getContest("1")