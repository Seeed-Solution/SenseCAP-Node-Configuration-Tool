<template>
  <v-container fluid class="py-0">
    <v-row>
      <!-- 左半屏，输入框 -->
      <v-col cols="6">
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
            <v-text-field v-model="deviceEUI" label="Device EUI" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="12" class="py-0">
            <v-text-field v-model="appEUI" label="App EUI" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="12" class="py-0">
            <v-text-field v-model="appKey" label="App Key" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model.number="dataInterval" type="number" label="Data Interval"
              suffix="minutes" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model.number="battery" type="number" label="Battery"
              suffix="%" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model="hwVer" label="Hardware Version" outlined dense>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <v-text-field v-model="swVer" label="Software Version" outlined dense>
            </v-text-field>
          </v-col>
          <!-- Buttons -->
          <v-col cols="12" class="py-0 d-flex justify-space-around">
            <v-btn rounded color="secondary" width="120">Read</v-btn>
            <v-btn rounded color="secondary" width="120">Write</v-btn>
            <v-btn rounded color="secondary" width="120">Update Fw</v-btn>
          </v-col>
        </v-row>
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
        <div>v1.0.0</div>
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

export default {
  name: 'Home',
  data() {
    return {
      connectBtnText: 'Connect',
      connectBtnColor: 'primary',
      serialVSelectDisable: false,
      selectedSerialPort: null,
      serialPorts: [],
      serialOpened: false,
      deviceType: 'LoRaWAN',
      deviceEUI: '',
      appEUI: '',
      appKey: '',
      dataInterval: 60,
      battery: 100,
      hwVer: '',
      swVer: '',
      //stream parse
      stream: null,

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

    },
    writeFn() {

    },
    updateFwFn() {

    },
    parseLine(line) {
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
      }
      found = line.match(/App EUI:\s+(\w+)/i)
      if (found) {
        console.log('found App EUI:', found[1])
        this.appEUI = found[1]
      }
      found = line.match(/App Key:\s+(\w+)/i)
      if (found) {
        console.log('found App Key:', found[1])
        this.appKey = found[1]
      }
      found = line.match(/Data interval:\s+(\w+)/i)
      if (found) {
        console.log('found Data interval:', found[1])
        this.dataInterval = parseInt(found[1])
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
  watch: {
    serialOpened(newVal, oldVal) {
      if (newVal) {
        this.connectBtnText = 'Disconnect'
        this.connectBtnColor = 'secondary'
        this.serialVSelectDisable = true
      } else {
        this.connectBtnText = 'Connect'
        this.connectBtnColor = 'primary'
        this.serialVSelectDisable = false
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
