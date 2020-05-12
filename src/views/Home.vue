<i18n>
{
  "en": {
    "end": "end"
  },
  "zh": {
    "Serial Port": "串口",
    "Device Type": "设备类型",
    "Device EUI": "设备EUI",
    "Data Interval": "上报周期",
    "Hardware Version": "硬件版本",
    "Software Version": "软件版本",
    "Read": "读取",
    "Write": "写入",
    "Update Fw": "更新固件",
    "Connect": "连接",
    "Disconnect": "断开",

    "Must between [5, 43200]": "必须在[5, 43200]范围内",
    "Must between [5, 720]": "必须在[5, 720]范围内",
    "Invalid LoRaWAN EUI (16 chars)": "无效的LoRaWAN EUI (16字符)",
    "Invalid LoRaPP EUI (32 chars)": "无效的LoRaPP EUI (32字符)",

    "end": "结束"
  }
}
</i18n>
<template>
  <v-container fluid class="py-0">
    <v-row>
      <!-- 左半屏，输入框 -->
      <v-col cols="6">
        <v-form ref="form1">
        <v-row class="pt-1">
          <!-- Fields -->
          <v-col cols="12" md="6" class="py-0">
            <v-select v-model="selectedSerialPort" :label="$t('Serial Port')"
              :items="serialPorts"
              :disabled="serialVSelectDisable"
              @focus="onSerialVSelectClicked"
              outlined dense>
            </v-select>
          </v-col>
          <v-col cols="12" md="6" class="py-0 d-flex justify-start">
            <v-btn rounded :color="connectBtnColor" width="120"
              @click="ConnectFn">{{connectBtnText}}</v-btn>
          </v-col>
          <v-col cols="12" md="6" class="pb-0">
            <v-text-field v-model="deviceType" :label="$t('Device Type')" disabled outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="pb-0">
            <v-text-field v-model="deviceEUI" :label="$t('Device EUI')"
              :rules="deviceEUIRules" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="12" class="py-0">
            <v-text-field v-model="appEUI" :label="labelAppEUI"
              :rules="appEUIRules" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="12" class="py-0">
            <v-text-field v-model="appKey" :label="labelAppKey"
              :rules="appKeyRules" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model.number="dataInterval" type="number" :label="$t('Data Interval')"
              :rules="dataIntervalRules"
              :suffix="$t('minutes')" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model.number="battery" type="number" :label="$t('Battery')"
              suffix="%" disabled outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model="hwVer" :label="$t('Hardware Version')" disabled outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model="swVer" :label="$t('Software Version')" disabled outlined dense>
            </v-text-field>
          </v-col>
          <!-- Buttons -->
          <v-col cols="12" class="py-0 d-flex justify-space-around">
            <v-btn rounded color="secondary" width="120"
              @click.stop="readFn()"
              :disabled="!serialOpened">{{$t('Read')}}</v-btn>
            <v-btn rounded color="secondary" width="120"
              @click.stop="writeFn()"
              :loading="writeLoading"
              :disabled="!serialOpened">{{$t('Write')}}</v-btn>
            <v-btn rounded color="secondary" width="120"
              @click.stop="updateFwFn()"
              :loading="updateFwLoading"
              :disabled="!serialOpened">{{$t('Update Fw')}}</v-btn>
          </v-col>
        </v-row>
        </v-form>
      </v-col>
      <!-- 右半屏，console -->
      <v-col cols="6">
        <v-card outlined class="pl-2 pt-2">
        <div style="height:500px" id="terminal"></div>
        </v-card>
      </v-col>
    </v-row>
    <v-divider></v-divider>
    <!-- footer -->
    <v-row>
      <v-col cols="auto" class="d-flex flex-column align-center justify-center">
        <div style="width: 50px">
          <v-menu top offset-y close-on-click>
            <template v-slot:activator="{ on }">
              <span class="flag-icon" :class="flagIconClass" v-on="on"></span>
            </template>
            <v-list dense class="pa-0">
              <v-list-item-group v-model="locale">
                <v-list-item key="item1" class="py-0" link style="min-height: 30px;" value="en">
                  <v-list-item-title class="caption">English</v-list-item-title>
                </v-list-item>
                <v-list-item key="item2" class="py-0" link style="min-height: 30px;" value="zh">
                  <v-list-item-title class="caption">简体中文</v-list-item-title>
                </v-list-item>
              </v-list-item-group>
            </v-list>
          </v-menu>
        </div>
      </v-col>
      <v-col class="d-flex justify-center">
        <div>
          <v-img src="../assets/sensecap.png" width="100px"></v-img>
        </div>
      </v-col>
      <v-col cols="auto" class="d-flex flex-column align-center justify-center caption grey--text">
        <div>
          <v-tooltip top open-delay="1000" :disabled="!newVersion">
            <template v-slot:activator="{ on }">
              <v-badge color="pink" dot top :value="newVersion">
                <span v-on="on" @click="versionClicked()" id="versionText">v{{currentVersion}}</span>
              </v-badge>
            </template>
            <span>v{{newVersion}} available</span>
          </v-tooltip>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
// @ is an alias to /src
// import HelloWorld from '@/components/HelloWorld.vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
const { ipcRenderer } = require('electron')
const { Readable } = require('stream')
const RegexParser = require('@serialport/parser-regex')
const ReadlineParser = require('@serialport/parser-readline')
const Store = require('electron-store');
const store = new Store();

const delayMs = ms => new Promise(res => setTimeout(res, ms))

export default {
  name: 'Home',
  data() {
    let rules = {
      required: value => !!value || this.$t("Required."),
      rangeWAN: value => (value >= 5 && value <=43200) || this.$t("Must between [5, 43200]"),
      rangePP: value => (value >= 5 && value <=720) || this.$t("Must between [5, 720]"),
      int: value => (/\.+/.test(value)) ? this.$t("Must be integer.") : true,
      eui16: value => (/^\w{16}$/.test(value)) || this.$t("Invalid LoRaWAN EUI (16 chars)"),
      eui32: value => (/^\w{32}$/.test(value)) || this.$t("Invalid LoRaPP EUI (32 chars)"),
    }
    return {
      //rules
      rules: rules,
      deviceEUIRules: [rules.required, rules.eui16],
      appEUIRules: [rules.required, rules.eui16],
      appKeyRules: [rules.required, rules.eui32],
      dataIntervalRules: [rules.required, rules.int, rules.rangeWAN],
      //loading
      writeLoading: false,
      updateFwLoading: false,
      //
      // connectBtnText: this.$t('Connect'),
      // connectBtnColor: 'secondary',
      // serialVSelectDisable: false,
      selectedSerialPort: null,
      serialPorts: [],
      serialOpened: false,
      labelAppEUI: 'App EUI',
      labelAppKey: 'App Key',
      deviceType: 'LoRaWAN',
      deviceEUI: '',
      deviceEUI2: '',
      appEUI: '',
      appEUI2: '',
      appKey: '',
      appKey2: '',
      dataInterval: 60,
      dataInterval2: 60,
      battery: 100,
      hwVer: '',
      swVer: '',
      //stream parse
      stream: null,
      pauseParseLine: false,
      //ota
      currentVersion: '',
      newVersion: '',
      //i18n
      selectedLocaleIso: 'us',
      locale: 'en',
    }
  },
  watch: {
    deviceType(newVal, oldVal) {
      if (newVal === 'LoRaWAN') {
        this.labelAppEUI = 'App EUI'
        this.labelAppKey = 'App Key'
        this.appEUIRules = [this.rules.required, this.rules.eui16]
        // this.dataIntervalRules = [this.rules.required, this.rules.int, this.rules.rangeWAN]
      } else if (newVal === 'LoRaPP') {
        this.labelAppEUI = 'Key A'
        this.labelAppKey = 'Key B'
        this.appEUIRules = [this.rules.required, this.rules.eui32]
        // this.dataIntervalRules = [this.rules.required, this.rules.int, this.rules.rangePP]
      }
    },
    locale(newVal, oldVal) {
      console.log('locale newVal:', newVal, ', oldVal:', oldVal)
      if (newVal === oldVal || !newVal) return
      if (newVal === 'en') this.selectedLocaleIso = 'us'
      else if (newVal === 'zh') this.selectedLocaleIso = 'cn'
      this.$root.$i18n.locale = newVal
      store.set('chosenLocale', newVal)
      ipcRenderer.send('locale-change', newVal)
    }
  },
  computed: {
    flagIconClass: function() {
      return 'flag-icon-' + this.selectedLocaleIso.toLowerCase()
    },
    connectBtnText: function() {
      return this.serialOpened ? this.$t('Disconnect') : this.$t('Connect')
    },
    connectBtnColor: function() {
      return this.serialOpened ? 'primary' : 'secondary'
    },
    serialVSelectDisable: function() {
      return this.serialOpened
    }
  },
  methods: {
    onSerialVSelectClicked() {
      ipcRenderer.send('init-serial-req')
      return true
    },
    ConnectFn() {
      console.log(this.selectedSerialPort)
      if (!this.selectedSerialPort) return
      if (!this.serialOpened) {
        ipcRenderer.send('serial-open-req', this.selectedSerialPort)
      } else {
        ipcRenderer.send('serial-close-req')
      }
    },
    readFn() {
      ipcRenderer.send('serial-rx', '\r\nh')
    },
    writeFn() {
      this.deviceEUI = this.deviceEUI.trim()
      this.appEUI = this.appEUI.trim()
      this.appKey = this.appKey.trim()

      if (!this.$refs.form1.validate()) return false

      this.writeLoading = true

      let needUpdateDeviceEUI = (this.deviceEUI !== this.deviceEUI2)
      let needUpdateAppEUI = (this.appEUI !== this.appEUI2)
      let needUpdateAppKey = (this.appKey !== this.appKey2)
      let needUpdateDataInterval = (this.dataInterval !== this.dataInterval2)
      console.log({
        needUpdateDeviceEUI: needUpdateDeviceEUI,
        needUpdateAppEUI: needUpdateAppEUI,
        needUpdateAppKey: needUpdateAppKey,
        needUpdateDataInterval: needUpdateDataInterval
      })

      if (!(needUpdateDeviceEUI || needUpdateAppEUI || needUpdateAppKey || needUpdateDataInterval)) {
        console.log('no need to write')
        this.writeLoading = false
        return
      }

      this.pauseParseLine = true
      ipcRenderer.send('serial-rx', '\r\n')
      delayMs(500).then(() => {
        ipcRenderer.send('serial-rx', 'h')
      }).then(() => {
        return delayMs(500)
      })
      .then(() => { //device EUI
        this.pauseParseLine = false
        if (needUpdateDeviceEUI) ipcRenderer.send('serial-rx', 'd')
      }).then(() => {
        if (needUpdateDeviceEUI) return delayMs(500)
      }).then(() => {
        if (needUpdateDeviceEUI) {
          ipcRenderer.send('serial-rx', this.deviceEUI + '\r\n')
        }
      }).then(() => {
        if (needUpdateDeviceEUI) return delayMs(1000)
      })
      .then(() => { //app EUI
        if (needUpdateAppEUI) ipcRenderer.send('serial-rx', 'a')
      }).then(() => {
        if (needUpdateAppEUI) return delayMs(500)
      }).then(() => {
        if (needUpdateAppEUI) {
          ipcRenderer.send('serial-rx', this.appEUI + '\r\n')
        }
      }).then(() => {
        if (needUpdateAppEUI) return delayMs(1000)
      })
      .then(() => { //app Key
        let cmd = 'k'
        if (this.deviceType === 'LoRaPP') cmd = 'b'
        if (needUpdateAppKey) ipcRenderer.send('serial-rx', cmd)
      }).then(() => {
        if (needUpdateAppKey) return delayMs(500)
      }).then(() => {
        if (needUpdateAppKey) {
          ipcRenderer.send('serial-rx', this.appKey + '\r\n')
        }
      }).then(() => {
        if (needUpdateAppKey) return delayMs(1000)
      })
      .then(() => { //data Interval
        if (needUpdateDataInterval) ipcRenderer.send('serial-rx', 'i')
      }).then(() => {
        if (needUpdateDataInterval) return delayMs(500)
      }).then(() => {
        if (needUpdateDataInterval) {
          ipcRenderer.send('serial-rx', this.dataInterval + '\r\n')
        }
      }).then(() => {
        if (needUpdateDataInterval) return delayMs(1000)
      })
      .then(() => { //read back finally to refresh the old value
        this.readFn()
      })
      .catch((err) => {
        console.warn('writeFn error:', err)
      })
      .finally(() => {
        this.writeLoading = false
      })
    },
    updateFwFn() {
      if (!this.serialOpened) return
      ipcRenderer.send('serial-rx', '\r\n')
      delayMs(500).then(() => {
        ipcRenderer.send('serial-rx', 'h')
      }).then(() => {
        return delayMs(1000)
      })
      .then(() => { //update firmware
        this.pauseParseLine = true
        ipcRenderer.send('serial-rx', 'u')
      }).then(() => {
        return delayMs(500)
      }).then(() => {
        ipcRenderer.send('select-file', this.selectedSerialPort)
      })
      .catch((err) => {
        console.warn('update firmware error:', err)
      })
      .finally(() => {
        // this.pauseParseLine = false
      })
    },
    parseLine(line) {
      if (this.pauseParseLine) return

      let found
      found = line.match(/Device Type:\s+(\w+)/i)
      if (found) {
        console.log('found device type:', found[1])
        this.deviceType = found[1]
      }
      found = line.match(/Device EUI:\s+(\w+)/i)
      if (found) {
        console.log('found device EUI:', found[1])
        this.deviceEUI = found[1]
        this.deviceEUI2 = this.deviceEUI
      }
      found = line.match(/new Device EUI is\s+(\w+)/i)
      if (found) {
        console.log('confirm device EUI written:', found[1])
        this.deviceEUI2 = found[1]
      }
      found = line.match(/(App EUI|Key A):\s+(\w+)/i)
      if (found) {
        console.log('found App EUI:', found[2])
        this.appEUI = found[2]
        this.appEUI2 = this.appEUI
      }
      found = line.match(/(App Key|Key B):\s+(\w+)/i)
      if (found) {
        console.log('found App Key:', found[2])
        this.appKey = found[2]
        this.appKey2 = this.appKey
      }
      found = line.match(/Data interval:\s+(\w+)/i)
      if (found) {
        console.log('found Data interval:', found[1])
        this.dataInterval = parseInt(found[1])
        this.dataInterval2 = this.dataInterval
      }
      found = line.match(/Battery:\s+(\w+)%/i)
      if (found) {
        console.log('found Battery:', found[1])
        this.battery = parseInt(found[1])
      }
      found = line.match(/Hardware version:\s+([vV0-9.]+)/i)
      if (found) {
        console.log('found Hardware version:', found[1])
        this.hwVer = found[1]
      }
      found = line.match(/Software firmware:\s+([vV0-9.]+)/i)
      if (found) {
        console.log('found Software firmware:', found[1])
        this.swVer = found[1]
      }
    },
    formatLocale(locale) {
      if (locale.includes('en')) return 'en'
      else if (locale.includes('zh')) return 'zh'
      else if (locale.includes('cn')) return 'zh'
      return 'en'
    },
    versionClicked() {
      ipcRenderer.send('goto-new-version')
    }
  },
  created() {
    let chosenLocale = store.get('chosenLocale')
    if (!chosenLocale) {
      ipcRenderer.send('locale-req')
      ipcRenderer.on('locale-resp', (event, arg) => {
        console.log('local-resp:', arg)
        chosenLocale = arg
        this.$root.$i18n.locale = this.formatLocale(chosenLocale)
        this.locale = this.$root.$i18n.locale
        console.log(`locale after requested: ${this.locale}`)
      })
    } else {
      this.$root.$i18n.locale = this.formatLocale(chosenLocale)
    }
    this.locale = this.$root.$i18n.locale
    console.log(`locale when created: ${this.locale}`)

    if (this.locale === 'en') this.selectedLocaleIso = 'us'
    else if (this.locale === 'zh') this.selectedLocaleIso = 'cn'
  },
  mounted() {

    let terminalContainer = document.getElementById('terminal')
    this.term = new Terminal({
      theme: {
        background: '#ffffff',
        foreground: '#78909C',
        cursor: '#15780F',
        selection: '#76FF0344'
      },
      fontSize: 12,
      cursorBlink: true,

    })
    const fitAddon = new FitAddon()
    this.term.loadAddon(fitAddon)
    this.term.open(terminalContainer)
    fitAddon.fit()

    this.term.onData((data) => {
      // the bootloader does echo-back
      // if (data === '\r') data = '\r\n'
      // this.term.write(data)
      ipcRenderer.send('serial-rx', data)
    })

    //stream
    this.stream = new Readable({
      read: (size) => {}
    })

    //serial
    ipcRenderer.on('init-serial-resp', (event, arg) => {
      console.log('init-serial-resp:', arg)
      let {ports, selectedPort, opened} = arg
      this.serialPorts = []
      for (let p of ports) {
        this.serialPorts.push(p.path)
      }
      this.selectedSerialPort = selectedPort
      this.serialOpened = opened
    })
    ipcRenderer.send('init-serial-req')

    ipcRenderer.on('serial-open-resp', (event, arg) => {
      console.log('serial-open-resp:', arg)
      let {opened, reason} = arg
      if (opened) {
        this.serialOpened = true
      } else {
        console.error('serial open failed:', reason)
      }
    })
    ipcRenderer.on('serial-close-resp', (event, arg) => {
      console.log('serial-close-resp:', arg)
      let {closed, reason} = arg
      if (closed) {
        this.serialOpened = false

        this.updateFwLoading = false
        this.pauseParseLine = false
      } else {
        console.error('serial close failed:', reason)
      }
    })
    ipcRenderer.on('serial-tx', (event, arg) => {
      this.term.write(arg)
      this.stream.push(arg)
    })
    //parser
    const parser = this.stream.pipe(new ReadlineParser())
    parser.on('data', (line) => {
      // console.log(line, 'len:', line.length)
      this.parseLine(line)
    })
    //ota
    ipcRenderer.on('current-version-resp', (event, arg) => {
      console.log('current-version-resp:', arg)
      let {currentVersion} = arg
      this.currentVersion = currentVersion
    })
    ipcRenderer.send('current-version-req')
    //update fw
    ipcRenderer.on('update-fw-begin', (event) => {
      this.updateFwLoading = true
    })
    ipcRenderer.on('update-fw-end', (event) => {
      this.updateFwLoading = false
      this.pauseParseLine = false
    })
    ipcRenderer.on('update-available', (event, arg) => {
      console.log('update-available:', arg)
      this.newVersion = arg
      document.getElementById('versionText').style.cursor = 'pointer'
    })
  },
  beforeDestroy() {
    ipcRenderer.removeAllListeners()
  }

}
</script>
<style scoped>
.mytextarea {
  font-size: 12px;
  line-height: 12px;
}
</style>
