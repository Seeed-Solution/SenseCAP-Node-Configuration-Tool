import Vue from 'vue';
import Vuetify from 'vuetify/lib';

Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    dark: false,
    themes: {
      light: {
        primary: '#15780F',
        accent: '#8EEF9A',
        secondary: '#205C71',
        success: '#4ADE50',
        info: '#2196F3',
        warning: '#FB8C00',
        error: '#FF5252'
      }
    }
  }
});
