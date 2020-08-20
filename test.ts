import _ from 'axios'
import { Cookie, CookieJar } from 'tough-cookie'
import axiosCookieJarSupport from 'axios-cookiejar-support'
import { contestStyle, contestType } from './src/utils/shared'
import * as fs from 'fs'
export const jar = new CookieJar();
// @ts-ignore
import MarkdownIt from 'markdown-it';
// @ts-ignore
import markdownKatex from '@luogu-dev/markdown-it-katex';
// @ts-ignore
import markdownItHighlight from 'markdown-it-highlightjs';

// const md = new MarkdownIt().use(markdownKatex).use(markdownItHighlight);

// export default md

export const CSRF_TOKEN_REGEX = /<meta name="csrf-token" content="(.*)">/

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
  export const ranklist = (cid: string, page: number) => `/fe/api/contest/scoreboard/${cid}?page=${page}`
}

export const axios = (() => {
  const axios = _.create({
    baseURL: API.baseURL,
    withCredentials: true
  })
  axiosCookieJarSupport(axios)

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
  defaults.timeout = 6000;

  // It's correct though TypeScript doesn't think so.
  // Reference: https://www.npmjs.com/package/axios-cookiejar-support#notice-set-default-cookiejar
  (defaults.jar as any) = jar;

  return axios
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

const cookie = new Cookie({
  key: '_uid',
  value: '39863',
  path: '/',
  domain: API.cookieDomain
})
const cookie1 = new Cookie({
  key: '__client_id',
  value: '5b876923c5f79761f5b38a5468e4002ad11cda52',
  path: '/',
  domain: API.cookieDomain
})
jar.setCookie(cookie, API.baseURL, (err) => { })
jar.setCookie(cookie1, API.baseURL, (err) => { })
export enum colorStyle {
  'grey' = 'font-weight: bold; color: rgb(243, 156, 17);',
  'blue' = 'font-weight: bold; color: rgb(52, 152, 219);',
  'green' = 'font-weight: bold; color: rgb(82, 196, 26);',
  'orange' = 'font-weight: bold; color: rgb(243, 156, 17);',
  'red' = 'font-weight: bold; color: rgb(243, 156, 17);',
  'purple' = 'font-weight: bold; color: rgb(157, 61, 207);',
  'cheater' = 'font-weight: bold; color: rgb(173, 139, 0);'
}
export function getUsernameStyle (color: string): string {
  return colorStyle[color];
}

export function getUserSvg (ccfLevel: number): string {
  if (ccfLevel === 0) {
    return '';
  }
  const green = `#52c41a`;
  const blue = `#3498db`;
  const gold = `#ffc116`;
  const color = ccfLevel >= 3 && ccfLevel <= 5 ? green : ccfLevel >= 6 && ccfLevel <= 7 ? blue : gold;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="${color}" style="margin-bottom: -3px;"><path d="M16 8C16 6.843
  75 15.25 5.84375 14.1875 5.4375C14.6562 4.4375 14.4688 3.1875 13.6562 2.34375C12.8125 1.53125 11.5625 1.34375 10.5625 1.8125C10.1562 0.75 9.15625 0 8 0C6.8125 0 5.8125 0.75 5.40625 1.8125C4.40625 1.34375 3.15625 1.53125 2.34375 2.34375C1.5 3.1875 1.3125 4.4375 1.78125 5.4375C0.71875 5.84375 0 6.84375 0 8C0 9.1875 0.71875 10.1875 1.78125 10.5938C1.3125 11.5938 1.5 12.8438 2.34375 13.6562C3.15625 14.5 4.40625 14.6875 5.40625 14.2188C5.8125 15.2812 6.8125 16 8 16C9.15625 16 10.1562 15.2812 10.5625 14.2188C11.5938 14.6875 12.8125 14.5 13.6562 13.6562C14.4688 12.8438 14.6562 11.5938 14.1875 10.5938C15.25 10.1875 16 9.1875 16 8ZM11.4688 6.625L7.375 10.6875C7.21875 10.8438 7 10.8125 6.875 10.6875L4.5 8.3125C4.375 8.1875 4.375 7.96875 4.5 7.8125L5.3125 7C5.46875 6.875 5.6875 6.875 5.8125 7.03125L7.125 8.34375L10.1562 5.34375C10.3125 5.1875 10.5312 5.1875 10.6562 5.34375L11.4688 6.15625C11.5938 6.28125 11.5938 6.5 11.4688 6.625Z"></path></svg>`;
}

export const countDown = (begin: number, end: number) => {
  console.error(begin)
  console.error(end)
  let x = 0
  let day = 0
  let hour = 0
  let minute = 0
  let now = Math.floor(new Date().getTime() / 1000)
  let res = ''
  if (now < begin) {
    res = '据比赛开始还有 '
    x = begin - now
  }
  if (now >= begin && now <= end) {
    res = '据比赛结束还有 '
    x = end - now
  }
  if (now > end) {
    return '比赛已经结束了'
  }
  if (x >= 86400) {
    day = Math.floor(x / 86400)
    x -= day * 86400
    res += day.toString() + ' 天 '
  }
  if (x >= 3600) {
    hour = Math.floor(x / 3600)
    x -= hour * 3600
    res += hour.toString() + ' 小时 '
  }
  if (x >= 60) {
    minute = Math.floor(x / 60)
    x -= minute * 60
    res += minute.toString() + ' 分 '
  }
  if (x > 0) {
    res += x.toString() + ' 秒'
  }
  return res
}
export const changeTime = (x: number) => {
  let res = ''
  if (x >= 86400) {
    res += Math.floor(x / 86400).toString() + ' 天 '
    x -= Math.floor(x / 86400) * 86400
  }
  if (x >= 3600) {
    res += Math.floor(x / 3600).toString() + ' 小时 '
    x -= Math.floor(x / 3600) * 3600
  }
  if (x >= 60) {
    res += Math.floor(x / 60).toString() + ' 分 '
    x -= Math.floor(x / 60) * 60
  }
  if (x > 0) {
    res += x.toString() + ' 秒 '
  }
  return res
}

export const formatTime = (date: Date, fmt: string) => {
  const o = {
    'y+': date.getFullYear(),
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    'q+': Math.floor((date.getMonth() + 3) / 3),
    'S+': date.getMilliseconds()
  };
  for (let k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      if (k === 'y+') {
        fmt = fmt.replace(RegExp.$1, ('' + o[k]).substr(4 - RegExp.$1.length));
      } else if (k === 'S+') {
        let lens = RegExp.$1.length;
        lens = lens === 1 ? 3 : lens;
        fmt = fmt.replace(RegExp.$1, ('00' + o[k]).substr(('' + o[k]).length - 1, lens));
      } else {
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
      }
    }
  }
  return fmt;
}
export const getContest = async (cid: string) =>
  axios.get(API.CONTEST(cid))
    .then(res => res.data.currentData).then(async res => {
      // console.log('a' as number + 1)
      let html = generateHTML(res)
      // console.log(res)
      console.log(html)
      // conol
    }).catch(err => { throw err })

export const getRanklist = async (cid: string, page: number) => {
  axios.get(API.ranklist(cid, page))
    .then(res => res.data).then(async res => {
      // let html =
      console.log(generateRanklist(res))
    }).catch(err => { throw err })
}

const generateRanklist = async (res: any[]) => {
  return `
  <!-- 以下为排行榜 -->
        <div data-v-6e56e2aa="" class="border table" style="display: none" id="showranklist">
            <div data-v-6e56e2aa="" class="header-wrap">
                <div data-v-239a177d="" data-v-6e56e2aa="" class="header">
                    <span id="ranklist"> </span>
                </div>
            </div>
        </div>
        <script>
        function displayranklist(ranklist) {
          var i = 0
          var ans = '<table>\\n<tr>\\n<th>名次</th>\\n<th>参赛者</th>\\n<th>总分</th>\\n'
          for (;i < 4; i++) {
            ans += '<th>' + String.fromCharCode(65 + i) + '</th>\\n'
          }
          ans += '</tr>\\n</table>\\n'
          return ans
        }
        document.getElementById("showranklist").innerHTML = displayranklist(${ JSON.stringify(/*res['scoreboard']['result']*/[])})
        </script>
  `
}

const generateHTML = async (res: any[]) => {
  const contest = res['contest']
  return `
  <!DOCTYPE html>
<html class="no-js" lang="zh">

<head>
    <meta charset="utf-8">
    <title>比赛详情 - ${contest['name']}</title>
</head>

<body>
    <h1 data-v-52820d90="" class="lfe-h1">${contest['name']}</h1>
    <div data-v-83303c00="" data-v-7c02ef97="" class="stat color-inverse" data-v-52820d90="">
        <div data-v-83303c00="" class="field">
            <span data-v-83303c00="" class="key lfe-caption">题目数</span>
            <span data-v-83303c00="" class="value lfe-caption">${contest['problemCount']}</span>
        </div>
        <div data-v-83303c00="" class="field">
            <span data-v-83303c00="" class="key lfe-caption">报名人数</span>
            <span data-v-83303c00="" class="value lfe-caption">${contest['totalParticipants']}</span>
        </div>
    </div>
    <div data-v-6febb0e8="" data-v-72177bf8="" class="full-container" style="margin-top: 0px;">
        <section data-v-72177bf8="" data-v-6febb0e8="" class="side">
            <div data-v-796309f8="" class="card padding-default" data-v-6febb0e8="">
                <div data-v-3a151854="" class="info-rows" data-v-796309f8="" style="margin-bottom: 1em;">
                    <div data-v-3a151854="">
                        <span data-v-3a151854="">
                            <span data-v-3a151854="">比赛编号</span>
                        </span>
                        <span data-v-3a151854="">
                            <span data-v-3a151854="">${contest['id']}</span>
                        </span>
                    </div>
                    <div data-v-3a151854="">
                        <span data-v-3a151854="">
                            <span data-v-3a151854="">举办者</span>
                        </span>
                        <span data-v-3a151854="">
                            <span data-v-3a151854="">
                                <span data-v-360481bd="" class="wrapper">
                                    <span data-v-360481bd="" data-v-303bbf52="" id="hoststyle">
                                        ${contest['host']['name']}
                                    </span>
                                    <span id="host"> </span>
                                </span>
                            </span>
                        </span>
                        <script>
                            function Host(visibilityType) {
                            }
                            if(false)Host(1)
                        </script>
                    </div>
                    <div data-v-3a151854="">
                        <span data-v-3a151854="">
                            <span data-v-3a151854="">比赛类型</span>
                        </span>
                        <span data-v-20b7d558 data-v-c0996248 class="lfe-captiontag" style="${contestStyle[contest['ruleType']]}">${contestType[contest['ruleType']]}</span>
                        <span class="lg-small lg-inline-up">
                        </span>
                    </div>
                    <div>
                        <span data-v-8d4c9aee="" class="lfe-caption">开始时间：${formatTime(new Date(contest['startTime'] as number * 1000), 'yyyy-MM-dd hh:mm:ss')}</span>
                    </div>
                    <div>
                        <span data-v-8d4c9aee="" class="lfe-caption">结束时间：${formatTime(new Date(contest['endTime'] as number * 1000), 'yyyy-MM-dd hh:mm:ss')}</span>
                    </div>
                    <div>
                        <span data-v-8d4c9aee="" class="lfe-caption">比赛时长：${changeTime(+contest['endTime'] - +contest['startTime'])}</span>
                    </div>
                    <div>
                        <span data-v-8d4c9aee="" class="lfe-caption" id="countdown"> </span>
                    </div>
                </div>
            </div>
        </section>
        <main data-v-27cf0bac="" class="wrapped lfe-body" style="background-color: rgb(239, 239, 239);">
            <div data-v-6febb0e8="" data-v-27cf0bac="" class="full-container" currenttemplate="ContestShow" currenttheme="[object Object]" style="margin-top: 2em;">
                <div data-v-796309f8="" class="card padding-default" data-v-6febb0e8="">
                    <div data-v-8feadc5c="" slot="header" data-v-796309f8="">
                        <div data-v-8feadc5c="" class="category">
                            <!---->
                            <table>
                                <tr>
                                    <th data-v-8feadc5c="" class=""><!----><input type="button" value="比赛说明" onclick="Description()" style="background-color: rgb(52,152,219); color: rgb(255,255,255)" id="description"></th>
                                    <th data-v-8feadc5c="" class=""><!----> <input type="button" value="题目列表" onclick="ProblemList()" id="problemlist"></th>
                                    <th data-v-8feadc5c="" class=""><!----> <input type="button" value="排行榜" onclick="Ranklist()" id="ranklist"></th>
                                </tr>
                            </table>
                            <script>
                                var last="description"
                                var lastshow="showdescription"
                                function Description() {
                                    document.getElementById(last).style=""
                                    document.getElementById(lastshow).style="display: none"
                                    last="description"
                                    lastshow="showdescription"
                                    document.getElementById(last).style="background-color: rgb(52,152,219); color: rgb(255,255,255)"
                                    document.getElementById(lastshow).style=""
                                }
                                function ProblemList() {
                                    document.getElementById(last).style=""
                                    document.getElementById(lastshow).style="display: none"
                                    last="problemlist"
                                    lastshow="showproblem"
                                    document.getElementById(last).style="background-color: rgb(52,152,219); color: rgb(255,255,255)"
                                    document.getElementById(lastshow).style=""
                                }
                                function Ranklist() {
                                    document.getElementById(last).style=""
                                    document.getElementById(lastshow).style="display: none"
                                    last="ranklist"
                                    lastshow="showranklist"
                                    document.getElementById(last).style="background-color: rgb(52,152,219); color: rgb(255,255,255)"
                                    document.getElementById(lastshow).style=""
                                }
                            </script>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <script>
            function formatCountDown(begin, end) {
                var x = 0
                var now = Math.floor(new Date().getTime() / 1000)
                var res = ''
                if (now < begin) {
                    res = '据比赛开始还有 '
                    x = begin - now
                }
                if (now >= begin && now <= end) {
                    res = '据比赛结束还有 '
                    x = end - now
                }
                if (now > end) {
                    return '比赛已经结束了'
                }
                res += formatTime(x)
                return res
            }

            function formatTime(x) {
                var res = ''
                if (x >= 86400) {
                    res += Math.floor(x / 86400).toString() + ' 天 '
                    x -= Math.floor(x / 86400) * 86400
                }
                if (x >= 3600) {
                    res += Math.floor(x / 3600).toString() + ' 小时 '
                    x -= Math.floor(x / 3600) * 3600
                }
                if (x >= 60) {
                    res += Math.floor(x / 60).toString() + ' 分 '
                    x -= Math.floor(x / 60) * 60
                }
                if (x > 0) {
                    res += x.toString() + ' 秒 '
                }
                return res
            }

            function updateCountDown() {
                document.getElementById("countdown").innerText = formatCountDown(${ contest['startTime']}, ${contest['endTime']})
            }

            setInterval(() => {
                updateCountDown();
            }, 1000);
            updateCountDown();
        </script>
        <!-- 以下为比赛说明 -->

        <div data-v-17281a3e="" data-v-8d4c9aee="" class="marked" data-v-0776707c="" id="showdescription">
            <section data-v-72177bf8="" data-v-6febb0e8="" class="main">
                <section data-v-6febb0e8="">
                    <div data-v-6febb0e8="">
                        <div data-v-796309f8="" class="card padding-default">
                            <div data-v-5a58a989="" class="marked" data-v-796309f8="">
                            </div>
                        </div>
                    </div>
                </section>
            </section>
        </div>
        <!-- 以下为题目列表 -->
        <div style="display: none" id="showproblem">
            <span data-v-8d4c9aee="" class="lfe-caption" id="problem"> </span>
        </div>
        <script>
            function showProblem(problem) {
                var i = 0
                var ans = '<table>\\n<tr>\\n<th>题号</th>\\n<th>满分</th>\\n<th>题目名称</th>\\n<th></th>\\n</tr>\\n'
                for (; i < problem.length; i++) {
                    ans += '<tr>\\n<td align="center">' + String.fromCharCode(65 + i) + '</td>\\n<td align="center">' + problem[i]['score'] + '</td>\\n<td align="center">' + problem[i]['problem']['title']
                    if (problem[i]['submitted'] === true) {
                        ans += '</td>\\n<td align="center" style="color: rgb(255, 255, 255); background: rgb(82, 196, 26);">已提交</td>\\n</tr>\\n'
                    } else {
                        ans += '</td>\\n<td align="center" style="color: rgb(255, 255, 255); background: rgb(231, 76, 60);">未提交</td>\\n</tr>\\n'
                    }
                }
                ans += '</tr>\\n</table>\\n'
                return ans
            }
            document.getElementById("problem").innerHTML = showProblem(${ JSON.stringify(res['contestProblems'])})
        </script>
        <!-- 以下为排行榜 -->
        <div data-v-6e56e2aa="" class="border table" style="display: none" id="showranklist">
            <div data-v-6e56e2aa="" class="header-wrap">
                <div data-v-239a177d="" data-v-6e56e2aa="" class="header">
                    <span id="ranklist"> </span>
                </div>
            </div>
        </div>
        <script>
        function displayranklist(ranklist) {
          var i = 0
          var ans = '<table>\\n<tr>\\n<th>名次</th>\\n<th>参赛者</th>\\n<th>总分</th>\\n'
          for (;i < ${contest['problemCount']}; i++) {
            ans += '<th>' + String.fromCharCode(65 + i) + '</th>\\n'
          }
          ans += '</tr>\\n</table>\\n'
          return ans
        }
        </script>
    </div>
</body>
</html>
  `
}

// tslint:disable-next-line: no-floating-promises
// getRanklist('6724', 1)
// getRanklist('31672', 1)
console.log(Math.min(1,2))

console.log(new Date().getTime())
