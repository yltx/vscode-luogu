import { readFileSync } from 'fs'
import { resolve } from 'path'
import { EventEmitter } from 'events'
import { has } from 'lodash'
import debug from '@/utils/debug'
import luoguStatusBar from '@/views/luoguStatusBar'
import { UserStatus } from '@/utils/shared'

export const SETTINGS_PATH = resolve('.luogu', 'settings.json')

interface ISetting {
  username?: string
  access_token?: string
  refresh_token?: string
}

// todo
class UserManager extends EventEmitter {
  private settings: ISetting = {}

  constructor () {
    super()
    this.on('login', () => {
      luoguStatusBar.updateStatusBar(UserStatus.SignedIn)
    })
    this.on('logout', () => {
      luoguStatusBar.updateStatusBar(UserStatus.SignedOut)
    })
    try {
      this.settings = JSON.parse(readFileSync(SETTINGS_PATH, { encoding: 'utf-8' }))
    } catch (e) {
      console.error(e)
    }
    if (!has(this.settings, 'access_token')) {
      debug('Can\'t find access_token in settings.')
      this.emit('logout')
    } else {
      // check token expires
      const refreshToken = this.settings.refresh_token
    }
  }
}

export default new UserManager()
