// export const isDev = process.env.NODE_ENV === 'development'
export const isDev = true

let time = 0

export function debug (message?: any, ...optionalParams: any[]) {
  if (isDev) {
    if (time !== 0) {
      time = Date.now() - time
    }
    console.log(`${message} ${time ? `// ${time}ms` : ''}`, ...optionalParams)
    time = Date.now()
  }
}

export default debug
