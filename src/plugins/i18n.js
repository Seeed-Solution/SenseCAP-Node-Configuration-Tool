import Vue from 'vue'
import VueI18n from 'vue-i18n'
import commonMessages from '../locale/common'

Vue.use(VueI18n)

let i18n = new VueI18n({
  locale: 'en',
  fallbackLocale: 'en',
  silentFallbackWarn: true,
  silentTranslationWarn: true,
  messages: commonMessages,
})

export default i18n