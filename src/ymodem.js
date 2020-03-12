
const EventEmitter = require('events')
const { Readable } = require('stream')
const crc = require('crc')

/**
 * How to Use?
 *
 * Read from Serial:
 * emit to 'rx' event, with data
 *
 * Write to Serial:
 * listen to 'tx' event, call resolve or reject according to success or failure
 *
 * Progress
 * listen to 'progress' event, arg is percent N(%)
 */

class yModem extends EventEmitter {
  constructor(mode1K = true, logFunc = console.log) {
    super()
    this.mode1K = mode1K
    this.chunkLen = this.mode1K ? 1024 : 128
    this.logFunc = logFunc

    this.stream = new Readable({
      read: () => {}
    })

    this.on('rx', (data) => {
      // this.logFunc('yModem rx:', data.toString('hex'))
      this.stream.push(data)
    })
  }

  clearStream() {
    while(this.stream.read()) {}
    this.stream.removeAllListeners('readable')
  }

  async waitByte(timeout = 2000) {
    return new Promise((resolve,reject) => {
      if (this.stream.readableLength > 0) {
        resolve(this.stream.read(1))
      } else {
        let h = setTimeout(() => {
          this.stream.removeAllListeners('readable')
          reject(new Error('waitByte timeout'))
        }, timeout)
        this.stream.on('readable', () => {
          let c = this.stream.read(1)
          if (c !== null) {
            clearTimeout(h)
            this.stream.removeAllListeners()
            resolve(c)
          }
        })
      }
    })
  }

  async waitYModemCmd(cmd, loops = 2, timeout = 2000) {
    let i = 0
    let b, c
    while(i++ < loops) {
      b = await this.waitByte(timeout)
      // this.logFunc('read from stream:', b)
      c = b[0]
      for(let key in yModem){
        if(c === yModem[key]){
          this.logFunc('cmd received: ' + key)
        }
      }
      if (c === cmd) return true
      if (c === yModem.NAK) throw new Error('NAK')
    }
    return false
  }

  async sendChunkAsync(chunk, timeout = 1500) {
    return new Promise((resolve, reject) => {
      let h = setTimeout(() => {
        reject(new Error('sendChunkAsync timeout'))
      }, timeout)
      // this.logFunc('chunk to send:', chunk.toString('hex'))
      this.emit('tx', chunk, resolve, reject)
    })
  }

  formPacket(soh, seq, data) {
    let packetLen = soh ? 128 : 1024
    let expectedPacketLen = packetLen + 5

    let protoHeader = soh ? yModem.SOH : yModem.STX
    let seqchr = Buffer.from([seq & 0xFF])
    let seqchrNeg = Buffer.from([(-seq - 1) & 0xFF])

    data = Buffer.concat([data, Buffer.alloc(packetLen - data.length)], packetLen)

    let crcString = crc.crc16xmodem(data).toString(16)
    // Need to avoid odd string for Buffer creation
    if(crcString.length % 2 == 1) {
      crcString = '0'.concat(crcString)
    }
    // CRC must be 2 bytes of length
    if(crcString.length === 2) {
      crcString = '00'.concat(crcString)
    }
    let crc16 = Buffer.from(crcString, "hex")

    return Buffer.concat([Buffer.from([protoHeader]), seqchr, seqchrNeg, data, crc16])
  }

  formFilenamePacket(filename, filesize) {
    let data = Buffer.concat([Buffer.from(filename), Buffer.from([0x0]), Buffer.from(`${filesize}`)])
    return this.formPacket(true, 0, data)
  }

  formEndingPacket() {
    let data = Buffer.from('')
    return this.formPacket(true, 0, data)
  }

  async transfer(fileContent) {
    this.logFunc('begin to transfer, length:', fileContent.length)
    this.clearStream()
    let pkt, chunk
    let fileLen = fileContent.length

    //wait C
    if(!await this.waitYModemCmd(yModem.CRC16)) throw new Error('wait for C timeout')

    //send filename header
    pkt = this.formFilenamePacket('firmware', fileLen)
    await this.sendChunkAsync(pkt)

    //wait ACK and C
    // if(!await this.waitYModemCmd(yModem.ACK)) throw new Error('wait for ACK timeout')
    if(!await this.waitYModemCmd(yModem.CRC16, 2, 10000)) throw new Error('wait for C timeout [2]')

    //send file chunks
    let seq = 0x1, chunkIndex = 0

    let lower = chunkIndex * this.chunkLen
    let higher = (chunkIndex + 1) * this.chunkLen
    if(higher >= fileLen){
      higher = fileLen
    }
    while (lower < fileLen) {
      chunk = fileContent.slice(lower, higher)
      pkt = this.formPacket(false, seq, chunk)
      await this.sendChunkAsync(pkt)

      try {
        if(!await this.waitYModemCmd(yModem.ACK)) throw new Error('wait for ACK timeout [2]')
      } catch (error) {
        if (error.message.includes('NAK')) continue
        else throw error
      }

      this.emit('progress', higher * 100.0 / fileLen)

      seq += 1
      chunkIndex += 1
      lower = chunkIndex * this.chunkLen
      higher = (chunkIndex + 1) * this.chunkLen
      if(higher >= fileLen){
        higher = fileLen
      }
    }

    //send EOT
    // await this.sendChunkAsync(Buffer.from([yModem.EOT]))
    // if(!await this.waitYModemCmd(yModem.NAK)) throw new Error('wait for NAK timeout')
    await this.sendChunkAsync(Buffer.from([yModem.EOT]))
    if(!await this.waitYModemCmd(yModem.ACK)) throw new Error('wait for ACK timeout [3]')
    // if(!await this.waitYModemCmd(yModem.CRC16)) throw new Error('wait for C timeout [3]')

    //send ending packet
    await this.sendChunkAsync(this.formEndingPacket())
  }
}

yModem.SOH = 0x01
yModem.STX = 0x02
yModem.EOT = 0x04
yModem.ACK = 0x06
yModem.NAK = 0x15
yModem.CA  = 0x18
yModem.CRC16 = 0x43

exports.yModem = yModem