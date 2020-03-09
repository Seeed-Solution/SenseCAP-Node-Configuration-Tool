<template>
  <v-container fluid class="py-0">
    <v-row>
      <!-- 左半屏，输入框 -->
      <v-col cols="6">
        <v-form ref="form1">
        <v-row class="pt-1">
          <!-- Fields -->
          <v-col cols="12" md="6" class="py-0">
            <v-select v-model="selectedSerialPort" label="Serial Port"
              :items="serialPorts"
              :disabled="serialVSelectDisable"
              @focus="onSerialVSelectClicked"
              outlined dense>
            </v-select>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <div>
              <v-btn rounded :color="connectBtnColor" @click="ConnectFn">{{connectBtnText}}</v-btn>
            </div>
          </v-col>
          <v-col cols="12" md="6" class="pb-0">
            <v-text-field v-model="deviceType" label="Device Type" disabled outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="pb-0">
            <v-text-field v-model="deviceEUI" label="Device EUI"
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
            <v-text-field v-model.number="dataInterval" type="number" label="Data Interval"
              :rules="dataIntervalRules"
              suffix="minutes" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model.number="battery" type="number" label="Battery"
              suffix="%" disabled outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model="hwVer" label="Hardware Version" disabled outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model="swVer" label="Software Version" disabled outlined dense>
            </v-text-field>
          </v-col>
          <!-- Buttons -->
          <v-col cols="12" class="py-0 d-flex justify-space-around">
            <v-btn rounded color="secondary" width="120" @click.stop="readFn()">Read</v-btn>
            <v-btn rounded color="secondary" width="120" @click.stop="writeFn()" :loading="writeLoading">Write</v-btn>
            <v-btn rounded color="secondary" width="120" @click.stop="updateFwFn()" :loading="updateFwLoading">Update Fw</v-btn>
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
    <v-row>
      <v-col cols="auto">
        <div style="width: 50px"></div>
      </v-col>
      <v-col class="d-flex justify-center">
        <div>
          <v-img src="../assets/sensecap.png" width="100px"></v-img>
        </div>
      </v-col>
      <v-col cols="auto" class="d-flex flex-column align-center justify-center caption grey--text">
        <div>v{{currentVersion}}</div>
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
const delayMs = ms => new Promise(res => setTimeout(res, ms))

export default {
  name: 'Home',
  data() {
    let rules = {
      required: value => !!value || "Required.",
      rangeWAN: value => (value >= 5 && value <=43200) || "Must between [5, 43200]",
      rangePP: value => (value >= 5 && value <=720) || "Must between [5, 720]",
      int: value => (/\.+/.test(value)) ? "Must be integer." : true,
      eui16: value => (/^\w{16}$/.test(value)) || "Invalid LoRaWAN EUI (16 chars)",
      eui32: value => (/^\w{32}$/.test(value)) || "Invalid LoRaPP EUI (32 chars)",
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
      connectBtnText: 'Connect',
      connectBtnColor: 'secondary',
      serialVSelectDisable: false,
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

    }
  },
  watch: {
    serialOpened(newVal, oldVal) {
      if (newVal) {
        this.connectBtnText = 'Disconnect'
        this.connectBtnColor = 'primary'
        this.serialVSelectDisable = true
      } else {
        this.connectBtnText = 'Connect'
        this.connectBtnColor = 'secondary'
        this.serialVSelectDisable = false
      }
    },
    deviceType(newVal, oldVal) {
      if (newVal === 'LoRaWAN') {
        this.labelAppEUI = 'App EUI'
        this.labelAppKey = 'App Key'
        this.appEUIRules = [this.rules.required, this.rules.eui16]
        this.dataIntervalRules = [this.rules.required, this.rules.int, this.rules.rangeWAN]
      } else if (newVal === 'LoRaPP') {
        this.labelAppEUI = 'KeyA'
        this.labelAppKey = 'KeyB'
        this.appEUIRules = [this.rules.required, this.rules.eui32]
        this.dataIntervalRules = [this.rules.required, this.rules.int, this.rules.rangePP]
      }
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
      ipcRenderer.send('serial-rx', 'h\r\n')
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
        ipcRenderer.send('serial-rx', 'h\r\n')
      }).then(() => {
        return delayMs(500)
      })
      .then(() => { //device EUI
        this.pauseParseLine = false
        if (needUpdateDeviceEUI) ipcRenderer.send('serial-rx', 'd\r\n')
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
        if (needUpdateAppEUI) ipcRenderer.send('serial-rx', 'a\r\n')
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
        if (needUpdateAppKey) ipcRenderer.send('serial-rx', 'k\r\n')
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
        if (needUpdateDataInterval) ipcRenderer.send('serial-rx', 'i\r\n')
      }).then(() => {
        if (needUpdateDataInterval) return delayMs(500)
      }).then(() => {
        if (needUpdateDataInterval) {
          ipcRenderer.send('serial-rx', this.dataInterval + '\r\n')
        }
      }).then(() => {
        if (needUpdateDataInterval) return delayMs(1000)
      })
      .catch((err) => {
        console.warn('writeFn error:', err)
      })
      .finally(() => {
        this.writeLoading = false
      })
    },
    updateFwFn() {

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
      found = line.match(/App EUI:\s+(\w+)/i)
      if (found) {
        console.log('found App EUI:', found[1])
        this.appEUI = found[1]
        this.appEUI2 = this.appEUI
      }
      found = line.match(/App Key:\s+(\w+)/i)
      if (found) {
        console.log('found App Key:', found[1])
        this.appKey = found[1]
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
    }
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
