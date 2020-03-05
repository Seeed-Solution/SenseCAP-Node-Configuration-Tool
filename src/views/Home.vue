<template>
  <v-container fluid class="py-0">
    <v-row>
      <!-- 左半屏，输入框 -->
      <v-col cols="6">
        <v-row class="pt-1">
          <!-- Fields -->
          <v-col cols="12" md="6" class="py-0">
            <v-select v-model="serialPort" label="Serial Port" :items="serialPorts" outlined dense></v-select>
          </v-col>
          <v-col cols="12" md="6" class="py-0">
            <div>
              <v-btn rounded color="primary">Connect</v-btn>
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

export default {
  name: 'Home',
  data() {
    return {
      serialPort: null,
      serialPorts: [],
      deviceType: 'LoRaWAN',
      deviceEUI: '',
      appEUI: '',
      appKey: '',
      dataInterval: 60,
      battery: 100,
      hwVer: '',
      swVer: '',

    }
  },
  mounted() {

    let terminalContainer = document.getElementById('terminal')
    this.term = new Terminal({
      theme: {
        background: '#ffffff',
        foreground: '#78909C',
        cursor: '#15780F'
      },
      fontSize: 12,
      cursorBlink: true,

    })
    const fitAddon = new FitAddon()
    this.term.loadAddon(fitAddon)
    this.term.open(terminalContainer)
    fitAddon.fit()

    this.term.onData((data) => {
      if (data === '\r') data = '\r\n'
      this.term.write(data)
    })
  }

}
</script>
<style scoped>
.mytextarea {
  font-size: 12px;
  line-height: 12px;
}
</style>
