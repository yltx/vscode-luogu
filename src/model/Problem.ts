export interface IAPIProblem {
  pid: string
  tags: Tag[]
  Type: number
  Sample: [string[]]
  InputFormat: string
  OutputFormat: string
  Name: string
  Hint: string
  Flag: string
  Description: string
  Background: string
  Translation?: string
}

export interface IAPITag {
  Id: number
  Name: string
  ParentId: number
}

export class Tag {
  private id = 0
  private name = ''
  private parentId = 0

  constructor (fields?: IAPITag) {
    if (!fields) {
      return
    }
    this.id = fields.Id
    this.name = fields.Name
    this.parentId = fields.ParentId
  }

  setID (id: number) {
    this.id = id
  }

  getID () {
    return this.id
  }

  setName (name: string) {
    this.name = name
  }

  getName () {
    return this.name
  }

  setParentID (parentId: number) {
    this.parentId = parentId
  }

  getParentID () {
    return this.parentId
  }
}

export class Problem {
  public stringPID = ''
  public tags: Tag[] = []
  public type = 0
  public sample: [string[]] = [[]]
  public inputFormat = ''
  public outputFormat = ''
  public name = ''
  public hint = ''
  public flag = ''
  public description = ''
  public background = ''
  public translation?: string

  public constructor (
    fields?: any
  ) {
    if (!fields) {
      return
    }
    this.stringPID = fields.pid
    this.tags = fields.tags
    this.type = fields.type
    this.sample = fields.samples
    this.inputFormat = fields.inputFormat
    this.outputFormat = fields.outputFormat
    this.name = fields.title
    this.hint = fields.hint
    this.flag = fields.flag
    this.description = fields.description
    this.background = fields.background
    this.translation = fields.translation
  }

  toHTML (): string {
    let sample = ''
    this.sample.forEach((array, index) => {
      sample += `<strong>输入${index + 1}</strong>:
                    <p>
                    ${array[0]}
                    </p>
                    <strong>输出${index + 1}</strong>:
                    <p>
                    ${array[1]}
                    </p>
                    `
    })
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${this.name}</title>
        </head>
        <article id="editor-container" style="height: 100%; width: 100%">
            <h1>${this.name}</h1>
            <h2>题目描述</h2>
            <p>${this.translation || ''}</p>
            <p>${this.background}</p>
            <p>${this.description}</p>
            <h2>输入输出格式</h2>
            <strong>输入格式</strong>
            <p>${this.inputFormat}</p>
            <strong>输出格式</strong>
            <p>${this.outputFormat}</p>
            <h2>输入输出样例</h2>
            ${sample}
            <h2>说明</h2>
            <p>${this.hint}</p>
        </article>
        </html>`
  }

  toMarkDown (): string {

    let sample = ''
    this.sample.forEach((array, index) => {
      sample += `输入${index + 1} : \n \`\`\` \n ${array[0][array[0].length - 1] === '\n' ? array[0] : array[0] + '\n'} \n \`\`\` \n 输出${index + 1} : \n \`\`\` \n ${array[1][array[1].length - 1] === '\n' ? array[1] : array[1] + '\n'} \n \`\`\` \n`
    })
    // return ` # ${this.name}| [${this.stringPID}](https://www.luogu.org/problem/${this.stringPID}) \n \n ${this.translation || ''} \n \n ## 题目描述 \n \n ${this.background} \n \n ${this.description} \n \n ## 输入输出格式 \n \n **输入格式** \n \n ${this.inputFormat} \n \n **输出格式** \n \n ${this.outputFormat} \n \n ## 输入输出样例 \n \n $$<textarea id="copy">${sample}</textarea><button type="button" onclick="copyData()" class="btn btn-small">复制</button> \n \n ## 说明 \n \n ${this.hint} \n`
    return ` # ${this.name}| [${this.stringPID}](https://www.luogu.org/problem/${this.stringPID}) \n \n ${this.translation ? '## 题意翻译 \n \n ' + this.translation : ''} \n \n ${this.background ? '## 题目背景 \n \n ' + this.background + ' \n \n ' : ''} ## 题目描述 \n \n ${this.description} \n \n ## 输入输出格式 \n \n **输入格式** \n \n ${this.inputFormat} \n \n **输出格式** \n \n ${this.outputFormat} \n \n ## 输入输出样例 \n \n ${sample} \n \n ## 说明/提示 \n \n ${this.hint} \n`

  }
}

export default Problem
