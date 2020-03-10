import Vue from 'vue'
import VueI18n from 'vue-i18n'
import commonMessages from '../locale/common'
const Store = require('electron-store')
const store = new Store()
const { ipcRenderer } = require('electron')

Vue.use(VueI18n)

let i18n = new VueI18n({
  locale: 'en',
  fallbackLocale: 'en',
  silentFallbackWarn: true,
  silentTranslationWarn: true,
  messages: commonMessages,
})

function formatLocale(locale) {
  if (locale.includes('en')) return 'en'
  else if (locale.includes('zh')) return 'zh'
  else if (locale.includes('cn')) return 'zh'
  return 'en'
}

//query stored locale
let chosenLocale = store.get('chosenLocale')
if (!chosenLocale) {
  ipcRenderer.send('locale-req')
  ipcRenderer.on('locale-resp', (event, arg) => {
    chosenLocale = arg

    i18n.locale = formatLocale(chosenLocale)
  })
} else {
  i18n.locale = formatLocale(chosenLocale)
}

export default i18n