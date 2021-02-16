'use strict'

/* global library */
/* global Acels */
/* global Source */
/* global History */
/* global Orca */
/* global IO */
/* global Cursor */
/* global Commander */
/* global Clock */
/* global Theme */
/* global Vi Handler */

function Client (body) {
  this.body = document.body

  this.version = 178
  this.library = library

  this.theme = new Theme(this)
  this.acels = new Acels(this)
  this.source = new Source(this)
  this.history = new History(this)

  this.orca = new Orca(this.library)
  this.io = new IO(this)
  this.cursor = new Cursor(this)
  this.commander = new Commander(this)
  this.clock = new Clock(this)

  this.vi = new Vi(this)

  // Settings
  this.scale = window.devicePixelRatio
  this.grid = { w: 8, h: 8 }
  this.tile = {
    w: +localStorage.getItem('tilew') || 30,
    h: +localStorage.getItem('tileh') || 30,
  }

  // we want our tiles to ideally be squares, if
  // for whatever reason it's not from localStorage
  // playing around with this values can be cool
  if (this.tile.w !== this.tile.h) {
    this.tile.w = 30
    this.tile.h = 30
  }

  this.el = document.createElement('canvas')
  this.el.style.width = '100%'
  this.el.style.height = '100%'

  this.context = this.el.getContext('2d')

  // options are 'top', 'bottom', 'hide'
  this.statusBar = localStorage.getItem('statusBar') || 'top'

  this.install = (host = this.body) => {
    host.appendChild(this.el)
    this.theme.install(host)

    this.acels.set('File', 'New', 'CmdOrCtrl+N', () => { this.reset() })
    this.acels.set('File', 'Open', 'CmdOrCtrl+O', () => { this.source.open('orca', this.whenOpen, true) })
    this.acels.set('File', 'Import Modules', 'CmdOrCtrl+L', () => { this.source.load('orca') })
    this.acels.set('File', 'Export', 'CmdOrCtrl+S', () => { this.source.write('orca', 'orca', `${this.orca}`, 'text/plain') })
    this.acels.set('File', 'Export Selection', 'CmdOrCtrl+Shift+S', () => { this.source.write('orca', 'orca', `${this.cursor.selection()}`, 'text/plain') })

    this.acels.set('Edit', 'Undo', 'CmdOrCtrl+Z', () => { this.history.undo() })
    this.acels.set('Edit', 'Redo', 'CmdOrCtrl+Shift+Z', () => { this.history.redo() })
    this.acels.add('Edit', 'cut')
    this.acels.add('Edit', 'copy')
    this.acels.add('Edit', 'paste')
    this.acels.set('Edit', 'Select All', 'CmdOrCtrl+A', () => { this.cursor.selectAll() })
    this.acels.set('Edit', 'Erase Selection', 'Backspace', () => { if (this.cursor.ins) { this.cursor.erase(); this.cursor.move(-1, 0) } else { this[this.commander.isActive ? 'commander' : 'cursor'].erase() } })
    this.acels.set('Edit', 'Uppercase', 'CmdOrCtrl+Shift+U', () => { this.cursor.toUpperCase() })
    this.acels.set('Edit', 'Lowercase', 'CmdOrCtrl+Shift+L', () => { this.cursor.toLowerCase() })
    this.acels.set('Edit', 'Drag North', 'Alt+ArrowUp', () => { this.cursor.drag(0, 1) })
    this.acels.set('Edit', 'Drag East', 'Alt+ArrowRight', () => { this.cursor.drag(1, 0) })
    this.acels.set('Edit', 'Drag South', 'Alt+ArrowDown', () => { this.cursor.drag(0, -1) })
    this.acels.set('Edit', 'Drag West', 'Alt+ArrowLeft', () => { this.cursor.drag(-1, 0) })
    this.acels.set('Edit', 'Drag North(Leap)', 'CmdOrCtrl+Alt+ArrowUp', () => { this.cursor.drag(0, this.grid.h) })
    this.acels.set('Edit', 'Drag East(Leap)', 'CmdOrCtrl+Alt+ArrowRight', () => { this.cursor.drag(this.grid.w, 0) })
    this.acels.set('Edit', 'Drag South(Leap)', 'CmdOrCtrl+Alt+ArrowDown', () => { this.cursor.drag(0, -this.grid.h) })
    this.acels.set('Edit', 'Drag West(Leap)', 'CmdOrCtrl+Alt+ArrowLeft', () => { this.cursor.drag(-this.grid.w, 0) })

    this.acels.set('Project', 'Find', 'CmdOrCtrl+J', () => { this.commander.start('find:') })
    this.acels.set('Project', 'Inject', 'CmdOrCtrl+B', () => { this.commander.start('inject:') })
    this.acels.set('Project', 'Toggle Commander', 'CmdOrCtrl+K', () => { this.commander.start() })
    this.acels.set('Project', 'Run Commander', 'Enter', () => { this.commander.run() })

    this.acels.set('Cursor', 'Toggle Vi Mode', 'CmdOrCtrl+Shift+?', () => { this.vi.toggle() })
    this.acels.set('Cursor', 'Toggle Insert Mode', 'CmdOrCtrl+I', () => { this.cursor.ins = !this.cursor.ins })
    this.acels.set('Cursor', 'Toggle Block Comment', 'CmdOrCtrl+/', () => { this.cursor.comment() })
    this.acels.set('Cursor', 'Trigger Operator', 'CmdOrCtrl+P', () => { this.cursor.trigger() })
    this.acels.set('Cursor', 'Reset', 'Escape', () => { this.commander.stop(); this.clear(); this.clock.isPaused = false; this.cursor.reset() })

    this.acels.set('Move', 'Move North', 'ArrowUp', () => { this.cursor.move(0, 1) })
    this.acels.set('Move', 'Move East', 'ArrowRight', () => { this.cursor.move(1, 0) })
    this.acels.set('Move', 'Move South', 'ArrowDown', () => { this.cursor.move(0, -1) })
    this.acels.set('Move', 'Move West', 'ArrowLeft', () => { this.cursor.move(-1, 0) })
    this.acels.set('Move', 'Move North(Leap)', 'CmdOrCtrl+ArrowUp', () => { this.cursor.move(0, this.grid.h) })
    this.acels.set('Move', 'Move East(Leap)', 'CmdOrCtrl+ArrowRight', () => { this.cursor.move(this.grid.w, 0) })
    this.acels.set('Move', 'Move South(Leap)', 'CmdOrCtrl+ArrowDown', () => { this.cursor.move(0, -this.grid.h) })
    this.acels.set('Move', 'Move West(Leap)', 'CmdOrCtrl+ArrowLeft', () => { this.cursor.move(-this.grid.w, 0) })
    this.acels.set('Move', 'Scale North', 'Shift+ArrowUp', () => { this.cursor.scale(0, 1) })
    this.acels.set('Move', 'Scale East', 'Shift+ArrowRight', () => { this.cursor.scale(1, 0) })
    this.acels.set('Move', 'Scale South', 'Shift+ArrowDown', () => { this.cursor.scale(0, -1) })
    this.acels.set('Move', 'Scale West', 'Shift+ArrowLeft', () => { this.cursor.scale(-1, 0) })
    this.acels.set('Move', 'Scale North(Leap)', 'CmdOrCtrl+Shift+ArrowUp', () => { this.cursor.scale(0, this.grid.h) })
    this.acels.set('Move', 'Scale East(Leap)', 'CmdOrCtrl+Shift+ArrowRight', () => { this.cursor.scale(this.grid.w, 0) })
    this.acels.set('Move', 'Scale South(Leap)', 'CmdOrCtrl+Shift+ArrowDown', () => { this.cursor.scale(0, -this.grid.h) })
    this.acels.set('Move', 'Scale West(Leap)', 'CmdOrCtrl+Shift+ArrowLeft', () => { this.cursor.scale(-this.grid.w, 0) })

    this.acels.set('Clock', 'Play/Pause', 'Space', () => { if (this.cursor.ins) { this.cursor.move(1, 0) } else { this.clock.togglePlay(false) } })
    this.acels.set('Clock', 'Frame By Frame', 'CmdOrCtrl+F', () => { this.clock.touch() })
    this.acels.set('Clock', 'Reset Frame', 'CmdOrCtrl+Shift+R', () => { this.clock.setFrame(0) })
    this.acels.set('Clock', 'Incr. Speed', '>', () => { this.clock.modSpeed(1) })
    this.acels.set('Clock', 'Decr. Speed', '<', () => { this.clock.modSpeed(-1) })
    this.acels.set('Clock', 'Incr. Speed(10x)', 'CmdOrCtrl+>', () => { this.clock.modSpeed(10, true) })
    this.acels.set('Clock', 'Decr. Speed(10x)', 'CmdOrCtrl+<', () => { this.clock.modSpeed(-10, true) })

    this.acels.set('View', 'Toggle Retina', 'Tab', () => { this.toggleRetina() })
    this.acels.set('View', 'Toggle Guide', 'CmdOrCtrl+G', () => { this.modal = 'guide' })
    this.acels.set('View', 'Incr. Col', ']', () => { this.modGrid(1, 0) })
    this.acels.set('View', 'Decr. Col', '[', () => { this.modGrid(-1, 0) })
    this.acels.set('View', 'Incr. Row', '}', () => { this.modGrid(0, 1) })
    this.acels.set('View', 'Decr. Row', '{', () => { this.modGrid(0, -1) })
    this.acels.set('View', 'Zoom In', 'CmdOrCtrl+=', () => { this.modZoom(0.0625) })
    this.acels.set('View', 'Zoom Out', 'CmdOrCtrl+-', () => { this.modZoom(-0.0625) })
    this.acels.set('View', 'Zoom Reset', 'CmdOrCtrl+0', () => { this.modZoom(1, true) })

    this.acels.set('Midi', 'Play/Pause Midi', 'CmdOrCtrl+Space', () => { this.clock.togglePlay(true) })
    this.acels.set('Midi', 'Next Input Device', 'CmdOrCtrl+,', () => { this.clock.setFrame(0); this.io.midi.selectNextInput() })
    this.acels.set('Midi', 'Next Output Device', 'CmdOrCtrl+.', () => { this.clock.setFrame(0); this.io.midi.selectNextOutput() })
    this.acels.set('Midi', 'Refresh Devices', 'CmdOrCtrl+Shift+M', () => { this.io.midi.refresh() })

    this.acels.set('Communication', 'Choose OSC Port', 'alt+O', () => { this.commander.start('osc:') })
    this.acels.set('Communication', 'Choose UDP Port', 'alt+U', () => { this.commander.start('udp:') })

    this.acels.install(window)
    this.acels.pipe = this.commander
  }

  this.start = () => {
    console.info('Client', 'Starting..')
    console.info(`${this.acels}`)
    this.theme.start()
    this.io.start()
    this.history.bind(this.orca, 's')
    this.history.record(this.orca.s)
    this.clock.start()
    this.cursor.start()

    this.reset()
    this.modZoom()
    this.update()
    this.el.className = 'ready'
  }

  this.reset = () => {
    this.orca.reset()
    this.resize()
    this.source.new()
    this.history.reset()
    this.cursor.reset()
    this.clock.play()
  }

  this.run = () => {
    this.io.clear()
    this.clock.run()
    this.orca.run()
    this.io.run()
    this.update()
  }

  this.update = () => {
    if (document.hidden === true) { return }
    this.clear()
    this.ports = this.findPorts()
    this.drawProgram()
    this.drawStatusBar()
    this.drawModal()
  }

  this.whenOpen = (file, text) => {
    const lines = text.trim().split(/\r?\n/)
    const w = lines[0].length
    const h = lines.length
    const s = lines.join('\n').trim()

    this.orca.load(w, h, s)
    this.history.reset()
    this.history.record(this.orca.s)
    this.resize()
  }

  this.setGrid = (w, h) => {
    this.grid.w = w
    this.grid.h = h
    this.update()
  }

  // options are 'top', 'bottom', 'hide'
  this.setStatusBar = option => {
    if (!['top', 'bottom', 'hide'].includes(option)) option = 'top'
    this.statusBar = option
    localStorage.setItem('statusBar', this.statusBar)
    this.resize()
  }

  this.toggleRetina = () => {
    this.scale = this.scale === 1 ? window.devicePixelRatio : 1
    console.log('Client', `Pixel resolution: ${this.scale}`)
    this.resize(true)
  }

  this.modGrid = (x = 0, y = 0) => {
    const w = clamp(this.grid.w + x, 4, 16)
    const h = clamp(this.grid.h + y, 4, 16)
    this.setGrid(w, h)
  }

  this.modZoom = (mod = 0, reset = false) => {
    let {w,h} = {
      w: reset ? 30 : this.tile.w * (mod + 1),
      h: reset ? 30 : this.tile.h * (mod + 1),
    }

    // set min or max depending on previous value
    // basically defines a min/max zoom value [5,100]
    h = h >= this.tile.h ? Math.min(100, h) : Math.max(5, h)
    w = w >= this.tile.w ? Math.min(100, w) : Math.max(5, w)

    this.tile = {
      w: w,
      h: h,
      ws: Math.floor(w * this.scale),
      hs: Math.floor(h * this.scale),
    }

    localStorage.setItem('tilew', w)
    localStorage.setItem('tileh', h)
    this.resize(true)
  }

  //

  this.isCursor = (x, y) => {
    return x === this.cursor.x && y === this.cursor.y
  }

  this.isMarker = (x, y) => {
    return x % this.grid.w === 0 && y % this.grid.h === 0
  }

  this.isNear = (x, y) => {
    return x > (parseInt(this.cursor.x / this.grid.w) * this.grid.w) - 1 && x <= ((1 + parseInt(this.cursor.x / this.grid.w)) * this.grid.w) && y > (parseInt(this.cursor.y / this.grid.h) * this.grid.h) - 1 && y <= ((1 + parseInt(this.cursor.y / this.grid.h)) * this.grid.h)
  }

  this.isLocals = (x, y) => {
    return this.isNear(x, y) === true && (x % (this.grid.w / 4) === 0 && y % (this.grid.h / 4) === 0) === true
  }

  this.isInvisible = (x, y) => {
    return this.orca.glyphAt(x, y) === '.' && !this.isMarker(x, y) && !this.cursor.selected(x, y) && !this.isLocals(x, y) && !this.ports[this.orca.indexAt(x, y)] && !this.orca.lockAt(x, y)
  }

  this.findPorts = () => {
    const a = new Array((this.orca.w * this.orca.h) - 1)
    for (const operator of this.orca.runtime) {
      if (this.orca.lockAt(operator.x, operator.y)) { continue }
      const ports = operator.getPorts()
      for (const port of ports) {
        const index = this.orca.indexAt(port[0], port[1])
        a[index] = port
      }
    }
    return a
  }

  // Interface

  this.makeTheme = (type) => {
    // Operator
    if (type === 0) { return { bg: this.theme.active.b_med, fg: this.theme.active.f_low } }
    // Haste
    if (type === 1) { return { fg: this.theme.active.b_med } }
    // Input
    if (type === 2) { return { fg: this.theme.active.b_high } }
    // Output
    if (type === 3) { return { bg: this.theme.active.b_high, fg: this.theme.active.f_low } }
    // Selected
    if (type === 4) { return { bg: this.theme.active.b_inv, fg: this.theme.active.f_inv } }
    // Locked
    if (type === 5) { return { fg: this.theme.active.f_med } }
    // Reader
    if (type === 6) { return { fg: this.theme.active.b_inv } }
    // Invisible
    if (type === 7) { return {} }
    // Output Bang
    // Output Reader
    if (type === 9) { return { bg: this.theme.active.b_inv, fg: this.theme.active.background } }
    // Reader+Background
    if (type === 10) { return { bg: this.theme.active.background, fg: this.theme.active.f_high } }
    // Clock(yellow fg)
    if (type === 11) { return { fg: this.theme.active.b_inv } }


    // Status line background
    // if (type === 2000) { return { bg: this.theme.active.f_low } }

    // Paused cursor
    if (type === 3000) { return { bg: this.theme.active.b_low, fg: this.theme.active.f_high } }
    // Paused clock in status bar
    if (type === 3001) { return { fg: this.theme.active.f_high } }


    // Background for popups
    if (type === 4000) { return { bg: this.theme.active.b_low, fg: this.theme.active.f_low } }

    // Default
    return { fg: this.theme.active.f_low }
  }

  // Canvas

  this.clear = () => {
    this.context.clearRect(0, 0, this.el.width, this.el.height)
  }

  this.drawProgram = () => {
    const yOffset = this.statusBar == 'top' ? 1 : 0

    const selection = this.cursor.read()
    for (let y = 0; y < this.orca.h; y++) {
      for (let x = 0; x < this.orca.w; x++) {
        // Handle blanks
        if (this.isInvisible(x, y)) { continue }
        // Make Glyph
        const g = this.orca.glyphAt(x, y)
        // Get glyph
        const glyph = g !== '.' ? g
                      : this.isCursor(x, y) ? (this.clock.isPaused ? '~' : '@')
                      : this.isMarker(x, y) ? '+'
                      : g
        // Make Style
        this.drawSprite(x, y+yOffset, glyph, this.makeStyle(x, y, glyph, selection))
      }
    }
  }

  this.makeStyle = (x, y, glyph, selection) => {
    if (this.clock.isPaused && glyph == '~') { return 3000 }
    if (this.cursor.selected(x, y)) { return 4 }
    const isLocked = this.orca.lockAt(x, y)
    if (selection === glyph && isLocked === false && selection !== '.') { return 6 }
    if (glyph === '*' && isLocked === false) { return 2 }
    const port = this.ports[this.orca.indexAt(x, y)]
    if (port) { return port[2] }
    if (isLocked === true) { return 5 }
    return 20
  }

  this.modal = null

  this.drawModal = () => {
    const draw = (values) => {
      if (!(this.vi.mode === "INFO" || this.vi.mode === "COMMAND")) {
        this.vi.switchTo("INFO")
      }

      const i0 = this.statusBar == 'top' ? 1 : 0
      const h0 = this.statusBar == 'top' ? 0 : -1
      for (let i=i0; i<=this.orca.h+h0; i++) {
        this.write(".".repeat(this.orca.w), 0, i, this.orca.w, 4000)
      }

      const max1 = Math.max.apply(Math, values.map((e, _) => (e[0] || '').length))
      const max2 = Math.max.apply(Math, values.map((e, _) => (e[1] || '').length))
      const max3 = Math.max.apply(Math, values.map((e, _) => (e[2] || '').length))

      values.forEach((e, i) => {
        const v1 = e[0]
        const v2 = e[1]
        const v3 = e[2]
        const frame = this.orca.h - 4
        const column = Math.floor(i / frame)
        const x1 = 1 + (column * (1+max3+max2+max1))
        const x2 = 1 + (column * (2+max3+max2))
        const x3 = 1 + (column * (3+max3))
        const y = (i % frame) + 1

        if (v1 == '---') {
          const length = max1 + (max2 > 0 ? 1+max2 : 0) + (max3 ? 1+max3 : 0)
          const separator = '-'.repeat(length)
          this.write(separator, 1+x1, y+1+i0, length, 10)
          return
        }

        if (v1) this.write(v1,           1+x1, y+1+i0, max1, 10)
        if (v2) this.write(v2,      2+x2+max1, y+1+i0, max2, 10)
        if (v3) this.write(v3, 3+x3+max1+max2, y+1+i0, max3, 10)
      })
    }

    if (this.modal === 'midils') {
      draw([
        ["Inputs", "ID", "Selected"],
        ["---"],
        ...this.io.midi.inputs.map((x, i) => [x.name, `${i}`, this.io.midi.inputIndex == i ? '*' : '']),
        [""],
        ["Outputs", "ID", "Selected"],
        ["---"],
        ...this.io.midi.outputs.map((x, i) => [x.name, `${i}`, this.io.midi.outputIndex == i ? '*' : '']),
      ])
    } else if (this.modal === 'tabcompletion' && this.vi.commandCompletionMatches.length > 0) {
      draw(this.vi.commandCompletionMatches.map(x => [x]))
    } else if (this.modal === 'guide') {
      draw(
        Object.keys(this.library)
          .filter(val => isNaN(val))
          .map(k => [k, (new this.library[k]()).info])
      )
    }
  }

  this.drawStatusBar = () => {
    const row = this.statusBar == 'top' ? 0 : this.statusBar == 'bottom' ? client.orca.h : client.orca.h-1

    if (this.commander.isActive === true) {
      const style = this.statusBar == 'hide' ? 4 : 2
      const indicator = this.statusBar == 'hide' ? ' ' : '_'
      this.write(`${this.commander.query}${this.orca.f % 4 === 0 ? indicator : ''}`, this.grid.w*0, row, this.grid.w * 4, style)
      return
    }

    if (this.statusBar == 'hide') return

    let left = 0
    let right = client.orca.w

    // Left hand side

    const modeInfo = `${this.vi.inspectMode()}`
    this.write(modeInfo, left, row, modeInfo.length)
    left += modeInfo.length
    if (left >= right) return

    const bpmInfo = ' ' + `${this.clock}${this.clock.isPaused ? '~' : ''}`
    this.write(bpmInfo, left, row, `${this.clock.speed.value}`.length+2, this.clock.isPuppet ? 3 : this.io.midi.isClock ? 11 : this.clock.isPaused ? 3001 : 2)
    left += `${this.clock.speed.value}`.length+2
    if (left >= right) return

    const frameInfo = `${this.orca.f}` + ' '
    this.write(frameInfo, left, row, frameInfo.length, this.clock.isPuppet ? 3 : this.io.midi.isClock ? 11 : this.clock.isPaused ? 3001 : 2)
    left += frameInfo.length
    if (left >= right) return

    const ioInfo = `${this.io.inspect(this.grid.w)}`
    this.write(ioInfo, left, row, ioInfo.length)
    left += ioInfo.length
    if (left >= right) return

    // Right hand side

    const gridInfo = `${this.orca.w}x${this.orca.h}`
    right -= gridInfo.length
    if (right <= left) return
    this.write(gridInfo, right, row, gridInfo.length)

    const cursorLocationInfo = `${this.cursor.x},${this.cursor.y}` + ' '
    right -= cursorLocationInfo.length
    if (right <= left) return
    this.write(cursorLocationInfo, right, row, cursorLocationInfo.length)

    const cursorSelectionInfo = `${this.cursor.w}:${this.cursor.h}` + ' '
    right -= cursorSelectionInfo.length
    if (right <= left) return
    this.write(cursorSelectionInfo, right, row, cursorSelectionInfo.length)

    const chordInfo = this.vi.inspectChord() + ' '
    right -= chordInfo.length
    if (right <= left) return
    this.write(chordInfo, right, row, chordInfo.length)

    // this.write(this.orca.f < 250 ? `< ${this.io.midi.toInputString()}` : '', this.grid.w * 5, this.orca.h, this.grid.w * 4)
    // this.write(`${this.cursor.inspect()}`, this.grid.w*3, row, this.grid.w)
    // this.write(`${this.grid.w}/${this.grid.h}${this.tile.w !== 10 ? ' ' + (this.tile.w / 10).toFixed(1) : ''}`, this.grid.w * 2, row, this.grid.w)
    // this.write(`${display(Object.keys(this.orca.variables).join(''), this.orca.f, this.grid.w - 1)}`, this.grid.w * 4, row, this.grid.w - 1)
    // this.write(this.orca.f < 250 ? `> ${this.io.midi.toOutputString()}` : '', this.grid.w * 5, row, this.grid.w * 4)
  }

  this.font = localStorage.getItem('fonts.selected') ||'default'

  this.fonts = {
    default: JSON.parse(localStorage.getItem('fonts.default')) || {
      name: 'input_mono_medium',
      scale: 1.1,
      offset_x: 0,
      offset_y: 0,
    },
    pixel: JSON.parse(localStorage.getItem('fonts.pixel')) || {
      name: 'uni_05_53regular',
      scale: 1.1,
      offset_x: 0,
      offset_y: 0,
    },
  }

  this.drawSprite = (x, y, glyph, type) => {
    const theme = this.makeTheme(type)
    if (theme.bg) {
      this.context.fillStyle = theme.bg
      this.context.fillRect(x * this.tile.ws, (y) * this.tile.hs, this.tile.ws, this.tile.hs)
    }
    if (theme.fg) {
      this.context.fillStyle = theme.fg
      this.context.fillText(
        glyph,
        (x + 0.5 + this.fonts[this.font].offset_x) * this.tile.ws,
        (y + 0 + this.fonts[this.font].offset_y) * this.tile.hs,
      )
    }
  }

  this.write = (text, offsetX, offsetY, limit = 50, type = 2) => {
    for (let x = 0; x < text.length && x < limit; x++) {
      this.drawSprite(offsetX + x, offsetY, text.substr(x, 1), type)
    }
  }

  // Resize tools

  this.resize = () => {
    const size = { w: window.innerWidth, h: window.innerHeight }

    // calc number of tiles that can fit within our window given a tile's dimensions
    // add an extra tile in height when status bar is hidden
    const tiles = { w: Math.floor(size.w / this.tile.w), h: Math.floor(size.h / this.tile.h)+(this.statusBar == 'hide' ? 1 : 0) }

    // clamp at limits of orca file ??
    const bounds = this.orca.bounds()
    if (tiles.w < bounds.w + 1) { tiles.w = bounds.w + 1 }
    if (tiles.h < bounds.h + 1) { tiles.h = bounds.h + 1 }

    // not too sure how this function works
    this.crop(tiles.w, tiles.h)

    // Keep cursor in bounds
    if (this.cursor.x >= tiles.w) { this.cursor.moveTo(tiles.w - 1, this.cursor.y) }
    if (this.cursor.y >= tiles.h) { this.cursor.moveTo(this.cursor.x, tiles.h - 1) }

    // canvas dimensions
    // ?? no clue why the offset addition works lol (why add instead of subtract??)
    const hOffset = this.statusBar == 'hide' ? 0 : 1
    const w = this.tile.ws * this.orca.w
    const h = this.tile.hs * (this.orca.h+hOffset)
    if (w === this.el.width && h === this.el.height) return

    this.el.width = w
    this.el.height = h
    this.updateFont()
    this.update()

    console.log(`Resized Orca grid: ${this.orca.w}x${this.orca.h}`)
  }

  this.updateFont = () => {
    this.context.textBaseline = 'top'
    this.context.textAlign = 'center'
    this.context.font = `${this.tile.hs * this.fonts[this.font].scale}px ${this.fonts[this.font].name}`
  }

  this.crop = (w, h) => {
    let block = `${this.orca}`

    if (h > this.orca.h) {
      block = `${block}${`\n${'.'.repeat(this.orca.w)}`.repeat((h - this.orca.h))}`
    } else if (h < this.orca.h) {
      block = `${block}`.split(/\r?\n/).slice(0, (h - this.orca.h)).join('\n').trim()
    }

    if (w > this.orca.w) {
      block = `${block}`.split(/\r?\n/).map((val) => { return val + ('.').repeat((w - this.orca.w)) }).join('\n').trim()
    } else if (w < this.orca.w) {
      block = `${block}`.split(/\r?\n/).map((val) => { return val.substr(0, val.length + (w - this.orca.w)) }).join('\n').trim()
    }

    this.history.reset()
    this.orca.load(w, h, block, this.orca.f)
  }

  // Docs

  this.docs = () => {
    let html = ''
    const operators = Object.keys(library).filter((val) => { return isNaN(val) })
    for (const id in operators) {
      const oper = new this.library[operators[id]]()
      const ports = oper.ports.input ? Object.keys(oper.ports.input).reduce((acc, key, val) => { return acc + ' ' + key }, '') : ''
      html += `- \`${oper.glyph.toUpperCase()}\` **${oper.name}**${ports !== '' ? '(' + ports.trim() + ')' : ''}: ${oper.info}.\n`
    }
    return html
  }

  // Events

  window.addEventListener('dragover', (e) => {
    e.stopPropagation()
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  })

  window.addEventListener('drop', (e) => {
    e.preventDefault()
    e.stopPropagation()
    for (const file of e.dataTransfer.files) {
      if (file.name.indexOf('.orca') < 0) { continue }
      this.modal = null
      this.source.read(file, null, true)
      this.commander.start(':inject ' + file.name.replace(/.orca$/, ''))
    }
  })

  window.onresize = (e) => {
    this.resize()
  }

  // Helpers

  function display (str, f, max) { return str.length < max ? str : str.slice(f % str.length) + str.substr(0, f % str.length) }
  function clamp (v, min, max) { return v < min ? min : v > max ? max : v }
}
