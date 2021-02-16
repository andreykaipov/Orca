'use strict'

/**
 * Adds Vi-inspired keybindings.
 *
 * The code here is honestly a giant mess.
 *
 * TODO case switch (~) in both normal and visual modes
 */
function Vi (client) {
  this.mode = null
  this.chordPrefix = ''
  this.commandCompletionMatches = []
  this.originalCommanderKeyDownHandler = client.commander.onKeyDown
  this.originalCommanderKeyUpHandler = client.commander.onKeyUp

  this.inspectMode = () => {
    if (!this.mode) return ""
    let short = this.mode == "VISUAL BLOCK" ? "VBLOCK" :
                this.mode == "VISUAL LINE"  ? "VLINE" :
                this.mode.substring(0,6)
    return short
  }
  this.inspectChord = () => this.mode /*&& this.chordPrefix != 1*/ ? `${this.chordPrefix}` : ""

  this.toggle = () => {
    if (this.mode == null) {
      client.history.record(client.orca.s)
      this.switchTo("NORMAL")
    } else {
      this.mode = null
      this.resetAcels()
      client.install()
      client.commander.onKeyDown = this.originalCommanderKeyDownHandler
      client.commander.onKeyUp = this.originalCommanderKeyUpHandler
    }
  }

  this.resetCommandCompletionMatches = () => this.commandCompletionMatches = []
  this.resetChord = () => this.chordPrefix = ''
  this.resetAcels = () => {
    client.acels.unset(
      /* common      */ 'Escape',
      /* normal mode */ 'I', 'Shift+I', 'O', 'Shift+O', 'A', 'Shift+A', 'Shift+R',
                        'X', 'D',
                        'H', 'J', 'K', 'L', 'Alt+H', 'Alt+J', 'Alt+K', 'Alt+L', '0', 'Shift+$',
                        'W', 'E', 'B', 'G', 'Shift+G',
                        'P', 'R',
                        'U', 'Ctrl+R',
                        'CmdOrCtrl+V', 'Shift+V', 'V',
                        'Shift+:', '/',
                        '1', '2', '3', '4', '5', '6', '7', '8', '9',
      /* insert mode */ 'Space', 'Delete', 'Enter',
      /* visual mode */ 'Shift+H', 'Shift+J', 'Shift+K', 'Shift+L', 'Y',
                        'Alt+H', 'Alt+J', 'Alt+K', 'Alt+L',
                        'Shift+Alt+H', 'Shift+Alt+J', 'Shift+Alt+K', 'Shift+Alt+L',
      /* cmd or find */ 'CmdOrCtrl+P', 'CmdOrCtrl+N', 'CmdOrCtrl+U', 'N',
    )

    // Some key bindings from the client are just super annoying because
    // I've got butter fingers, or they aren't necessary because we define
    // the bindings' actions within a mode ourselves.
    // Easily reverted by a client.install()
    client.acels.set('', '', 'Tab', () => {})
    client.acels.set('', '', 'Space', () => {})
    client.acels.set('', '', 'Backspace', () => {})
    client.acels.set('', '', 'CmdOrCtrl+I', () => {})
    client.acels.set('', '', 'CmdOrCtrl+Z', () => {})
    client.acels.set('', '', 'CmdOrCtrl+Shift+Z', () => {})
    client.acels.set('', '', 'CmdOrCtrl+V', () => {}) // paste
    client.acels.set('', '', 'CmdOrCtrl+N', () => {}) // source new file
    client.acels.set('', '', 'CmdOrCtrl+P', () => {}) // trigger operator
    client.acels.set('', '', 'CmdOrCtrl+Enter', () => {})
    client.acels.set('', '', 'CmdOrCtrl+K', () => {})
    client.acels.set('', '', 'CmdOrCtrl+J', () => {})
    client.acels.set('', '', 'CmdOrCtrl+H', () => {}) // normally Ctrl+H would hide Orca on Windows
    client.acels.set('', '', 'CmdOrCtrl+J', () => {}) // Orca's find, use / in normal instead
    client.acels.set('', '', 'CmdOrCtrl+K', () => {}) // Orca's commander, just $<cmd> instead
    client.acels.set('', '', 'CmdOrCtrl+L', () => {})
    client.acels.set('', '', 'CmdOrCtrl+ArrowUp', () => {})
    client.acels.set('', '', 'CmdOrCtrl+ArrowRight', () => {})
    client.acels.set('', '', 'CmdOrCtrl+ArrowDown', () => {})
    client.acels.set('', '', 'CmdOrCtrl+ArrowLeft', () => {})
    client.acels.set('', '', 'Shift+ArrowUp', () => {})
    client.acels.set('', '', 'Shift+ArrowRight', () => {})
    client.acels.set('', '', 'Shift+ArrowDown', () => {})
    client.acels.set('', '', 'Shift+ArrowLeft', () => {})
    client.acels.set('', '', 'CmdOrCtrl+Shift+ArrowUp', () => {})
    client.acels.set('', '', 'CmdOrCtrl+Shift+ArrowRight', () => {})
    client.acels.set('', '', 'CmdOrCtrl+Shift+ArrowDown', () => {})
    client.acels.set('', '', 'CmdOrCtrl+Shift+ArrowLeft', () => {})
  }

  this.switchTo = (mode) => {
    this.resetChord()
    this.resetAcels()
    client.cursor.reset()
    client.commander.stop()

    switch (mode) {
      case "NORMAL": this.normalMode(); break
      case "INSERT": this.insertMode(); break
      case "REPLACE": this.replaceMode(); break
      case "VISUAL BLOCK": this.visualBlockMode(); break
      case "VISUAL LINE": this.visualLineMode(); break
      case "COMMAND": this.commandMode(); break
      case "FIND": this.findMode(); break
      case "INFO": this.infoMode(); break
    }

    this.mode = mode
  }

  // For a when an informational modal is open
  this.infoMode = () => {
    client.acels.set('Vi', 'Normal mode', 'Escape', () => {
      client.modal = null
      this.resetCommandCompletionMatches()
      this.switchTo("NORMAL")
    })
    client.acels.set('Vi', 'Command', 'Shift+:', () => { this.switchTo("COMMAND") })
  }

  this.normalMode = () => {
    client.acels.set('Vi', 'Normal mode', 'Escape', () => {
      client.cursor.reset()
      this.resetChord()
    })

    // into insert mode
    client.acels.set('Vi', 'Insert',               'I',       () => { this.switchTo("INSERT") })
    client.acels.set('Vi', 'Insert Start Line',    'Shift+I', () => { client.cursor.moveTo(0, client.cursor.y); this.switchTo("INSERT") })
    client.acels.set('Vi', 'Append',               'A',       () => { client.cursor.move(1, 0); this.switchTo("INSERT") })
    client.acels.set('Vi', 'Append End Line',      'Shift+A', () => {
      const lastWordIndex = client.orca.w-this.lineRightOfCursor().split('').reverse().slice(1).findIndex(x => x !== '.')
      client.cursor.moveTo(lastWordIndex, client.cursor.y)
      this.switchTo("INSERT")
    })

    // for o and O, if we're on a word, we want to go back to its beginning before opening a new line.
    // if we're not on a word, just open a new line above or below the current cursor.
    client.acels.set('Vi', 'Insert Next Line',     'O',       () => {
      const line = this.lineLeftOfCursor().split('').reverse().slice(1)
      if (line.length > 1 && line[0] !== '.' && line[1] !== '.') this.jumpWordBack() // check to see if we need to go back
      const {x,y} = client.cursor
      client.cursor.selectNoUpdate(0, client.cursor.y+1, client.orca.w, client.orca.h-client.cursor.y-1)
      client.cursor.drag(0, -1, false)
      client.cursor.moveTo(x, y+1)
      client.history.record(client.orca.s)
      this.switchTo("INSERT")
    })
    client.acels.set('Vi', 'Insert Previous Line', 'Shift+O', () => {
      const line = this.lineLeftOfCursor().split('').reverse().slice(1)
      if (line.length > 1 && line[0] !== '.' && line[1] !== '.') this.jumpWordBack()
      const {x,y} = client.cursor
      client.cursor.selectNoUpdate(0, client.cursor.y, client.orca.w, client.orca.h-client.cursor.y-1)
      client.cursor.drag(0, -1, false)
      client.cursor.moveTo(x, y)
      client.history.record(client.orca.s)
      this.switchTo("INSERT")
    })

    // into replace mode
    client.acels.set('Vi', 'Replace',              'Shift+R', () => { this.switchTo("REPLACE") })

    // into visual modes; normal visual mode doesn't make sense because Orca selections can't wrap lines
    client.acels.set('Vi', 'Visual Block', 'CmdOrCtrl+V',  () => { this.switchTo("VISUAL BLOCK") })
    client.acels.set('Vi', 'Visual Line',  'Shift+V', () => { this.switchTo("VISUAL LINE") })
    client.acels.set('Vi', 'Visual Chord', 'V', () => {
      if (this.chordPrefix === 'v') { this.switchTo("VISUAL LINE") } else { this.chordPrefix = 'v' }
    })

    // command and find modes
    client.acels.set('Vi', 'Command', 'Shift+:', () => { this.switchTo("COMMAND") })
    client.acels.set('Vi', 'Find', '/', () => { this.switchTo("FIND") })

    // deletions
    client.acels.set('Vi', 'Erase', 'X', () => {
      client.orca.writeBlock(client.cursor.x, client.cursor.y, this.lineRightOfCursor().substring(1))
      client.history.record(client.orca.s)
    })
    client.acels.set('Vi', 'Delete', 'D', () => {
      if (this.chordPrefix.endsWith('d')) {
        const prefix = this.chordPrefix.slice(0, -1)*1 || 1
        if (!isNaN(prefix)) {
          client.history.record(client.orca.s)

          const {x,y} = client.cursor

          const linesBelowCursor = client.orca.h-y
          const linesToCut = Math.min(linesBelowCursor, prefix)-1
          const delta = linesBelowCursor-linesToCut

          client.cursor.selectNoUpdate(0, y, client.orca.w, linesToCut)
          client.cursor.cut()

          if (delta > 1) {
            client.cursor.selectNoUpdate(0, y+prefix, client.orca.w, delta)
            client.cursor.drag(0, prefix)
          }

          client.cursor.select(x, y, 0, 0)

          client.history.record(client.orca.s)
        } else {
          console.error(`Huh? ${prefix}`)
        }
        this.resetChord()
      } else {
        this.chordPrefix += 'd'
      }
    })

    // simple movements
    client.acels.set('Vi', 'Move West', 'H', () => {
      let f = client.cursor.move
      let multiplicity = this.chordPrefix || 1

      if (this.chordPrefix.startsWith('v')) {
        multiplicity = this.chordPrefix.substring(1) || 1
        f = client.cursor.scale
        this.switchTo("VISUAL BLOCK")
      }

      f(-1*multiplicity, 0); this.resetChord()
    })
    client.acels.set('Vi', 'Move South', 'J', () => {
      let f = client.cursor.move
      let multiplicity = this.chordPrefix || 1

      if (this.chordPrefix.startsWith('v')) {
        multiplicity = this.chordPrefix.substring(1) || 1
        f = client.cursor.scale
        this.switchTo("VISUAL BLOCK")
      }

      f(0, -1*multiplicity); this.resetChord()
    })
    client.acels.set('Vi', 'Move North', 'K', () => {
      let f = client.cursor.move
      let multiplicity = this.chordPrefix || 1

      if (this.chordPrefix.startsWith('v')) {
        multiplicity = this.chordPrefix.substring(1) || 1
        f = client.cursor.scale
        this.switchTo("VISUAL BLOCK")
      }

      f(0, 1*multiplicity); this.resetChord()
    })
    client.acels.set('Vi', 'Move East', 'L', () => {
      let f = client.cursor.move
      let multiplicity = this.chordPrefix || 1

      if (this.chordPrefix.startsWith('v')) {
        multiplicity = this.chordPrefix.substring(1) || 1
        f = client.cursor.scale
        this.switchTo("VISUAL BLOCK")
      }

      f(1*multiplicity, 0); this.resetChord()
    })

    // just some extra stuff
    client.acels.set('Vi', 'Move West(Leap)', 'Alt+H', () => { client.cursor.move(-client.grid.w, 0) })
    client.acels.set('Vi', 'Move South(Leap)', 'Alt+J', () => { client.cursor.move(0, -client.grid.h) })
    client.acels.set('Vi', 'Move North(Leap)', 'Alt+K', () => { client.cursor.move(0, client.grid.h) })
    client.acels.set('Vi', 'Move East(Leap)', 'Alt+L', () => { client.cursor.move(client.grid.w, 0) })

    // line start and end
    client.acels.set('Vi', 'Start of line', '0', () => {
      const {x,y,w,h} = client.cursor

      if (this.chordPrefix.endsWith('v')) {
        this.switchTo("VISUAL BLOCK")
        this.resetChord()
        client.cursor.scaleTo(-x, h)
      } else if (this.chordPrefix.endsWith('d')) {
        client.history.record(client.orca.s)
        client.cursor.selectNoUpdate(x-1, y, -x, 0)
        client.cursor.cut()
        const line = this.lineRightOfCursor()
        client.orca.writeBlock(0, y, ".".repeat(client.orca.w))
        client.orca.writeBlock(-1, y, line)
        client.cursor.moveTo(0, y)
        client.cursor.reset()
        this.resetChord()
        client.history.record(client.orca.s)
      } else if (!isNaN(this.chordPrefix||'x')) {
        this.chordPrefix += '0'
      } else {
        client.cursor.moveTo(0, y)
      }
    })
    client.acels.set('Vi', 'End of line', 'Shift+$', () => {
      const {x,y,w,h} = client.cursor

      if (this.chordPrefix.endsWith('v')) {
        this.switchTo("VISUAL BLOCK")
        this.resetChord()
        client.cursor.scaleTo(client.orca.w-x-1, h)
      } else if (this.chordPrefix.endsWith('d')) {
        client.history.record(client.orca.s)
        client.cursor.selectNoUpdate(x, y, client.orca.w, 0)
        client.cursor.cut()
        client.cursor.move(-1, 0)
        client.cursor.reset()
        this.resetChord()
        client.history.record(client.orca.s)
      } else {
        client.cursor.moveTo(client.orca.w, y)
      }
    })

    // word traversals
    client.acels.set('Vi', 'Go to word beginning', 'W', () => this.jumpWordBeginning())
    client.acels.set('Vi', 'Go to word ending', 'E', () => this.jumpWordEnding())
    client.acels.set('Vi', 'Go back word', 'B', () => this.jumpWordBack())
    client.acels.set('Vi', 'Goto', 'G', () => {
      const {x,y,w,h} = client.cursor

      if (this.chordPrefix.endsWith('vg')) {
        this.switchTo("VISUAL BLOCK")
        this.resetChord()
        client.cursor.scaleTo(w, -y)
      } else if (this.chordPrefix.endsWith('dg')) {
        client.history.record(client.orca.s)
        client.cursor.selectNoUpdate(0, 0, client.orca.w, y)
        client.cursor.cut()
        client.cursor.selectNoUpdate(0, y+1, client.orca.w, client.orca.h-y-2)
        client.cursor.drag(0, y+1)
        client.cursor.reset()
        this.resetChord()
        client.history.record(client.orca.s)
      } else if (this.chordPrefix.endsWith('g')) {
        const prefix = this.chordPrefix.slice(0, -1)
        if (prefix === '') { client.cursor.moveTo(0, 0) }
        else if (!isNaN(prefix)) { client.cursor.moveTo(0, prefix) }
        else { console.error(`Huh? ${prefix}`) }
        this.resetChord()
      } else {
        this.chordPrefix += 'g'
      }
    })
    client.acels.set('Vi', 'Goto End', 'Shift+G', () => {
      const {x,y,w,h} = client.cursor

      if (this.chordPrefix.endsWith('v')) {
        this.switchTo("VISUAL BLOCK")
        this.resetChord()
        client.cursor.scaleTo(w, client.orca.h-y-1)
      } else if (this.chordPrefix.endsWith('d')) {
        client.history.record(client.orca.s)
        client.cursor.selectNoUpdate(0, y, client.orca.w, client.orca.h-y-1)
        client.cursor.cut()
        client.cursor.reset()
        this.resetChord()
        client.history.record(client.orca.s)
      } else {
        client.cursor.moveTo(0, client.orca.h)
      }
    })

    client.acels.set('Vi', 'Paste', 'P', () => {
      const prefix = this.chordPrefix*1 || 1
      if (!isNaN(prefix)) {
        const {x,y} = client.cursor

        let height = -1
        const calcClipboardHeight = (e) => {
          const clipboard = e.clipboardData.getData('Text')
          height = clipboard.split('\n').length-1
        }

        document.addEventListener('paste', calcClipboardHeight)
        client.history.record(client.orca.s)
        for (let i = 0; i < prefix; i+=1) {
          client.cursor.paste()
          client.cursor.move(0, -height)
        }
        document.removeEventListener('paste', calcClipboardHeight)

        client.cursor.moveTo(x, y)
        client.cursor.reset()
      } else {
          console.error(`Huh? ${prefix}`)
      }
      this.resetChord()
    })

    client.acels.set('Vi', 'Undo', 'U', () => client.history.undo())
    client.acels.set('Vi', 'Redo', 'CmdOrCtrl+R', () => client.history.redo())

    client.acels.set('Vi', 'Switch casing', 'Shift+~', () => {
      const a = client.cursor.read().charCodeAt(0)
      const b = String.fromCharCode(
        65 <= a && a <= 90 ? a+32 :
        97 <= a && a <= 122 ? a-32 :
        a
      )
      client.cursor.write(b)
    })

    // Replace is further handled in the overwritten commander since we need to detect which key was pressed
    client.acels.set('Vi', 'Replace', 'R', () => {
      this.chordPrefix = 'r'
      this.resetAcels()
      client.acels.set('Vi', '', 'Space', () => { client.cursor.write('.'); this.resetChord(); this.normalMode() })
    })

    client.acels.set('Vi', 'Copy', 'Y', () => { client.cursor.copy() })

    client.commander.onKeyDown = (e) => {
      if (this.chordPrefix == 'r') {
        if (e.ctrlKey || e.metaKey || e.altKey || (e.shiftKey && e.key == 'Shift') || e.key == 'CapsLock') { return }
        if (e.key === '-') { return }
        client.cursor.write(e.key)
        this.resetChord()
        this.normalMode()
      }
      e.stopPropagation()
    }

    // misc
    ;[1,2,3,4,5,6,7,8,9].forEach(n => {
      client.acels.set('Vi', `${n}`, n, () => this.chordPrefix += `${n}`)
    })

    client.acels.set('Vi', 'Play/Pause', 'Space', () => client.clock.togglePlay(false))
  }

  const traverseHistoryBackwards = (type) => {
    if (client.commander[`${type}History`].length == 0) return
    client.commander[`${type}HistoryIndex`] = Math.max(0, client.commander[`${type}HistoryIndex`]-1)
    client.commander.query = client.commander[`${type}History`][client.commander[`${type}HistoryIndex`]]
  }

  const traverseHistoryForwards = (type) => {
    if (client.commander[`${type}History`].length == 0) return
    if (client.commander[`${type}History`].length-1 == client.commander[`${type}HistoryIndex`]) return
    client.commander[`${type}HistoryIndex`] = Math.min(client.commander[`${type}History`].length-1, client.commander[`${type}HistoryIndex`]+1)
    client.commander.query = client.commander[`${type}History`][client.commander[`${type}HistoryIndex`]]
  }

  this.commanderModeCommon = () => {
    client.acels.set('', '', 'ArrowUp', () => {})
    client.acels.set('', '', 'ArrowRight', () => {})
    client.acels.set('', '', 'ArrowDown', () => {})
    client.acels.set('', '', 'ArrowLeft', () => {})

    client.acels.set('Vi', '', 'Space', () => client.commander.query += ' ')
    client.acels.set('Vi', '', 'Backspace', () => { if (![':', '/'].includes(client.commander.query)) client.commander.erase() })
    client.acels.set('Vi', '', 'Escape', () => {
      client.modal = null
      this.switchTo("NORMAL")
    })

    client.acels.set('Vi', 'Paste', 'CmdOrCtrl+V', () => {
      const write = (e) => { client.commander.query += e.clipboardData.getData('Text').trim() }
      client.cursor.skipPaste = true
      document.addEventListener('paste', write)
      document.execCommand('paste')
      document.removeEventListener('paste', write)
      client.cursor.skipPaste = false
    })

    client.acels.set('Vi', 'Delete word', 'CmdOrCtrl+W', () => {
      const indicator = client.commander.query[0]
      const text = client.commander.query.slice(1).trim()
      // remove last word
      const end = Math.max(text.lastIndexOf(' '), text.lastIndexOf('.'))+1
      const textNoLastWord = text.substring(0, end)
      client.commander.query = indicator + textNoLastWord
    })
  }

  this.commandMode = () => {
    this.commanderModeCommon()

    client.commander.start(':')
    client.commander.onKeyDown = (e) => { client.commander.write(e.key); e.stopPropagation() }

    client.acels.set('Vi', 'Run', 'Enter', () => {
      client.commander.run()
      this.switchTo("NORMAL")
    })

    client.acels.set('', '', 'CmdOrCtrl+U', () => { client.commander.query = ':' })
    client.acels.set('', '', 'CmdOrCtrl+P', () => traverseHistoryBackwards('cmd'))
    client.acels.set('', '', 'CmdOrCtrl+N', () => traverseHistoryForwards('cmd'))
    client.acels.set('', '', 'ArrowUp', () => traverseHistoryBackwards('cmd'))
    client.acels.set('', '', 'ArrowDown', () => traverseHistoryForwards('cmd'))

    client.acels.set('Vi', 'Run', 'Enter', () => {
      client.commander.run()
      this.switchTo("NORMAL")
    })

    client.acels.set('Vi', 'Autocomplete', 'Tab', () => {
      let text = client.commander.query.slice(1)
      let matches = []
      let before = ':'

      let [cmd, arg] = text.split(' ')

      if (cmd === 'inject') {
        matches = Object.keys(client.source.cache).sort().filter(x => x.match(`^${arg}`))
        before = `:${cmd} `
      } else if (cmd === 'font') {
        matches = Object.keys(client.fonts).sort().filter(x => x.match(`^${arg}`))
        before = `:${cmd} `
      } else if (cmd === 'midiin' || cmd === 'midiout') {
        client.modal = 'midils'
        return
      } else {
        matches = Object.keys(client.commander.actives).sort().filter(x => x.match(`^${cmd}`))
      }

      this.commandCompletionMatches = []
      if (matches.length == 0) { return }
      if (matches.length == 1) { client.commander.query = before + matches[0]; return }
      if (matches.length >= 2 ) {
        client.modal = 'tabcompletion'
        this.commandCompletionMatches = matches

        // find largest common prefix; matches already sorted
        const first = matches[0]
        const last = matches[matches.length-1]
        let i = 0; while (i < first.length && first[i] == last[i]) i++
        client.commander.query = before + first.substring(0, i)
      }
    })
  }

  this.findMode = () => {
    this.commanderModeCommon()

    client.commander.start('/')
    client.commander.onKeyDown = (e) => { client.commander.write(e.key); e.stopPropagation() }

    client.acels.set('', '', 'CmdOrCtrl+U', () => { client.commander.query = '/' })
    client.acels.set('', '', 'CmdOrCtrl+P', () => traverseHistoryBackwards('find'))
    client.acels.set('', '', 'CmdOrCtrl+N', () => traverseHistoryForwards('find'))
    client.acels.set('', '', 'ArrowUp', () => traverseHistoryBackwards('find'))
    client.acels.set('', '', 'ArrowDown', () => traverseHistoryForwards('find'))

    client.acels.set('Vi', 'Run', 'Enter', () => {
      const search = client.commander.query.slice(1)
      client.commander.run()

      const cursorPositions = []

      client.acels.set('Vi', '', 'N', () => {
        const current = {x: client.cursor.x, y: client.cursor.y}
        const peek = cursorPositions[cursorPositions.length-1] || {x:-1, y:-1}

        if (peek.x !== current.x || peek.y !== current.y) cursorPositions.push(current)

        // find the next match by moving cursor to the right once
        client.cursor.move(1, 0)
        client.cursor.find(search)

        // move back if nothing was found
        if (client.cursor.x == current.x+1 && client.cursor.y == current.y+1) client.cursor.move(-1, 0)
      })

      client.acels.set('Vi', '', 'Shift+N', () => {
        if (cursorPositions.length == 0) return
        const pos = cursorPositions.pop()
        client.cursor.moveTo(pos.x, pos.y)
      })

      client.acels.set('Vi', 'Find', '/', () => { this.switchTo("FIND") })
    })
  }

  this.insertMode = () => {
    client.acels.set('Vi', 'Normal mode', 'Escape', () => {
      client.history.record(client.orca.s)
      client.cursor.reset()
      client.cursor.move(-1, 0)
      this.switchTo("NORMAL")
    })

    client.acels.set('Vi', 'Erase', 'Backspace', () => {
      client.orca.writeBlock(client.cursor.x-1, client.cursor.y, this.lineRightOfCursor())
      client.history.record(client.orca.s)
      client.cursor.move(-1, 0)
    })

    // just like x in normal mode
    client.acels.set('Vi', 'Erase Forward', 'Delete', () => {
      client.orca.writeBlock(client.cursor.x, client.cursor.y, this.lineRightOfCursor())
      client.history.record(client.orca.s)
    })

    // Same logic as o in normal mode, but check is a bit modified since
    // we always want to go back apart from when we're at the first character of the line
    // (in which case we're already at the beginning of the word)
    client.acels.set('Vi', 'Next line', 'Enter', () => {
      const line = this.lineLeftOfCursor().split('').reverse().slice(1)
      if (line.length > 1 && line[1] !== '.') this.jumpWordBack()
      const {x,y} = client.cursor
      client.cursor.selectNoUpdate(0, client.cursor.y+1, client.orca.w, client.orca.h-client.cursor.y-1)
      client.cursor.drag(0, -1, false)
      client.cursor.moveTo(x, y+1)
      client.cursor.reset()
    })

    // Same as above but just into replace mode, so no drag
    client.acels.set('Vi', 'Next line no linebreak', 'Shift+Enter', () => {
      const line = this.lineLeftOfCursor().split('').reverse().slice(1)
      if (line.length > 1 && line[1] !== '.') this.jumpWordBack()
      const {x,y} = client.cursor
      client.cursor.moveTo(x, y+1)
      this.switchTo("REPLACE")
    })

    // Handled similarly as any key in the commandar below, but has to be an acel to override the existing 'Space'
    client.acels.set('Vi', 'Space', 'Space', () => {
      client.orca.writeBlock(client.cursor.x+1, client.cursor.y, this.lineRightOfCursor())
      client.cursor.write('.', false)
      client.cursor.move(1, 0)
    })

    client.commander.onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.shiftKey && e.key == 'Shift') || e.key == 'CapsLock') { return }
      if (e.key === '-') { return }
      client.orca.writeBlock(client.cursor.x+1, client.cursor.y, this.lineRightOfCursor())
      client.cursor.write(e.key, false)
      client.cursor.move(1, 0)
      e.stopPropagation()
      // e.preventDefault()
    }
  }

  this.replaceMode = () => {
    this.insertMode()

    client.acels.set('Vi', 'Erase', 'Backspace', () => client.cursor.move(-1, 0))

    // This is Insert's Shift+Enter
    client.acels.set('Vi', 'Next line no linebreak', 'Enter', () => {
      const line = this.lineLeftOfCursor().split('').reverse().slice(1)
      if (line[0] === '.' || line[1] !== '.') this.jumpWordBack()
      const {x,y} = client.cursor
      client.cursor.moveTo(x, y+1)
    })

    client.acels.set('Vi', 'Space', 'Space', () => {
      client.orca.write(client.cursor.x, client.cursor.y, '.')
      client.cursor.move(1, 0)
    })

    client.commander.onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.shiftKey && e.key == 'Shift') || e.key == 'CapsLock') { return }
      if (e.key === '-') { return }
      client.cursor.write(e.key, false)
      client.cursor.move(1, 0)
      e.stopPropagation()
    }
  }

  this.visualModeCommon = () => {
    client.acels.set('Vi', 'Scale West', 'H', () => { client.cursor.scale(-1*(this.chordPrefix||1), 0); this.resetChord() })
    client.acels.set('Vi', 'Scale South', 'J', () => { client.cursor.scale(0, -1*(this.chordPrefix||1)); this.resetChord() })
    client.acels.set('Vi', 'Scale North', 'K', () => { client.cursor.scale(0, 1*(this.chordPrefix||1)); this.resetChord() })
    client.acels.set('Vi', 'Scale East', 'L', () => { client.cursor.scale(1*(this.chordPrefix||1), 0); this.resetChord() })
    client.acels.set('Vi', 'Start of line', '0', () => { if (!isNaN(this.chordPrefix||'x')) { this.chordPrefix += '0' } else { client.cursor.scaleTo(-client.cursor.x, client.cursor.h) } })
    client.acels.set('Vi', 'End of line', 'Shift+$', () => { client.cursor.scaleTo(client.orca.w-client.cursor.x-1, client.cursor.h) })

    client.acels.set('Vi', 'Bottom of page', 'Shift+G', () => { client.cursor.scaleTo(client.cursor.w, client.orca.h-client.cursor.y-1) })
    client.acels.set('Vi', 'Top of page', 'G', () => {
      if (this.chordPrefix.endsWith('g')) {
        client.cursor.scaleTo(client.cursor.w, -client.cursor.y)
        this.resetChord()
      } else {
        this.chordPrefix += 'g'
      }
    })

    client.acels.set('Vi', 'Scale West(Leap)', 'Alt+H', () => { client.cursor.scale(-client.grid.w, 0) })
    client.acels.set('Vi', 'Scale South(Leap)', 'Alt+J', () => { client.cursor.scale(0, -client.grid.h) })
    client.acels.set('Vi', 'Scale North(Leap)', 'Alt+K', () => { client.cursor.scale(0, client.grid.h) })
    client.acels.set('Vi', 'Scale East(Leap)', 'Alt+L', () => { client.cursor.scale(client.grid.w, 0) })

    client.acels.set('Vi', 'Drag West', 'Shift+H', () => { client.cursor.drag(-1*(this.chordPrefix||1), 0); this.resetChord() })
    client.acels.set('Vi', 'Drag South', 'Shift+J', () => { client.cursor.drag(0, -1*(this.chordPrefix||1)); this.resetChord() })
    client.acels.set('Vi', 'Drag North', 'Shift+K', () => { client.cursor.drag(0, 1*(this.chordPrefix||1)); this.resetChord()  })
    client.acels.set('Vi', 'Drag East', 'Shift+L', () => { client.cursor.drag(1*(this.chordPrefix||1), 0); this.resetChord() })
    client.acels.set('Vi', 'Drag West(Leap)', 'Shift+Alt+H', () => { client.cursor.drag(-client.grid.w, 0) })
    client.acels.set('Vi', 'Drag South(Leap)', 'Shift+Alt+J', () => { client.cursor.drag(0, -client.grid.h) })
    client.acels.set('Vi', 'Drag North(Leap)', 'Shift+Alt+K', () => { client.cursor.drag(0, client.grid.h) })
    client.acels.set('Vi', 'Drag East(Leap)', 'Shift+Alt+L', () => { client.cursor.drag(client.grid.w, 0) })

    client.acels.set('Vi', 'Copy', 'Y', () => { client.cursor.copy(); this.switchTo("NORMAL") })
    client.acels.set('Vi', 'Cut', 'X', () => { client.cursor.cut(); this.switchTo("NORMAL") })

    client.acels.set('Vi', 'Switch casing', 'Shift+~', () => {
      const selection = client.cursor.selection()
      const switched = selection.split('')
        .map(c => c.charCodeAt(0))
        .map(a => 65 <= a && a <= 90 ? a+32 : 97 <= a && a <= 122 ? a-32 : a)
        .map(a => String.fromCharCode(a))
        .join('')
      client.orca.writeBlock(client.cursor.minX, client.cursor.minY, switched)
    })

    ;[1,2,3,4,5,6,7,8,9].forEach(n => {
      client.acels.set('Vi', `${n}`, n, () => this.chordPrefix += `${n}`)
    })

    const handleReplaceKey = (key) => {
      const block = client.cursor.toRect()
      client.orca.writeBlock(block.x, block.y, `${key.repeat(block.w)}\n`.repeat(block.h))
      client.history.record(client.orca.s)
      this.resetChord()
      this.switchTo("NORMAL")
    }

    client.acels.set('Vi', 'Replace', 'R', () => {
      this.chordPrefix = 'r';
      this.resetAcels()
      client.acels.set('Vi', '', 'Space', () => handleReplaceKey('.'))
    })

    client.commander.onKeyDown = (e) => {
      if (this.chordPrefix == 'r') {
        if (e.ctrlKey || e.metaKey || e.altKey || (e.shiftKey && e.key == 'Shift') || e.key == 'CapsLock') { return }
        if (e.key === '-') { return }
        handleReplaceKey(e.key)
      }
      e.stopPropagation()
    }

    const {x,y} = client.cursor

    client.acels.set('Vi', 'Normal mode', 'Escape', () => {
      if (written !== '') {
        for (let i=1; i<rows; i+=1) {
          const nextY = blockInsertCursor.y+i
          client.orca.writeBlock(blockInsertCursor.x+written.length, nextY, this.lineRightOfCursor({...blockInsertCursor, y: nextY}))
          client.orca.writeBlock(blockInsertCursor.x, nextY, written)
        }
        client.cursor.moveTo(blockInsertCursor.x, blockInsertCursor.y)
      } else {
        if (this.mode === "VISUAL BLOCK") {
          client.cursor.moveTo(x+client.cursor.w, y+client.cursor.h)
        }
        client.cursor.reset()
      }
      client.history.record(client.orca.s)
      this.switchTo("NORMAL")
    })

    let written = ''
    let rows = 0
    let blockInsertCursor = {}

    client.acels.set('Vi', 'Block Insert',  'Shift+I', () => {
      this.mode = 'INSERT' // just to update the interface

      rows = Math.abs(client.cursor.h)+1
      blockInsertCursor.x = Math.min(x,x+client.cursor.w)
      blockInsertCursor.y = Math.min(y, y+client.cursor.h)

      client.cursor.moveTo(blockInsertCursor.x, blockInsertCursor.y)
      client.cursor.reset()

      const writeKey = (key) => {
        client.orca.writeBlock(client.cursor.x+1, client.cursor.y, this.lineRightOfCursor())
        client.cursor.write(key, false)
        client.cursor.move(1, 0)
        written += key
      }

      client.acels.set('Vi', 'Space', 'Space', () => writeKey('.'))
      client.acels.unset('1', '2', '3', '4', '5', '6', '7', '8', '9', 'H', 'J', 'K', 'L', 'Y', 'X', 'R', 'W', 'E', 'B')

      client.commander.onKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || (e.shiftKey && e.key == 'Shift') || e.key == 'CapsLock') { return }
        if (e.key === '-') { return }
        writeKey(e.key)
        e.stopPropagation()
      }
    })
  }

  this.visualBlockMode = () => {
    const {x,y} = client.cursor
    client.cursor.selectNoUpdate(x, y, 0, 0)
    client.acels.set('Vi', 'Visual Line',  'Shift+V', () => { this.switchTo("VISUAL LINE") })
    this.visualModeCommon()

    client.acels.set('Vi', 'Go to word beginning', 'W', () => this.jumpWordBeginning())
    client.acels.set('Vi', 'Go to word ending', 'E', () => this.jumpWordEnding())
    client.acels.set('Vi', 'Go back word', 'B', () => this.jumpWordBack())
  }

  this.visualLineMode = () => {
    const {x,y} = client.cursor
    client.cursor.selectNoUpdate(0, y, client.orca.w, 0)
    client.acels.set('Vi', 'Visual Block', 'CmdOrCtrl+V',  () => { this.switchTo("VISUAL BLOCK") })
    this.visualModeCommon()
  }

  // Returns the text to the right of our cursor until the end of the line
  // This includes the character under our cursor!
  this.lineRightOfCursor = (cursor = client.cursor) => {
    return client.orca.getBlock(
      cursor.x,
      cursor.y,
      client.orca.w-cursor.x,
      1,
    )
  }

  // Returns the text to the left of our cursor until the start of the line
  // This includes the character under our cursor!
  this.lineLeftOfCursor = () => {
    return client.orca.getBlock(
      0,
      client.cursor.y,
      client.cursor.x+1,
      1,
    )
  }

  this.lineRightOfSelection = (cursor = client.cursor) => {
    return client.orca.getBlock(
      cursor.x+cursor.w,
      cursor.y,
      client.orca.w-cursor.x,
      1,
    )
  }

  this.lineLeftOfSelection = (cursor = client.cursor) => {
    return client.orca.getBlock(
      cursor.w,
      cursor.y,
      cursor.x+1,
      1,
    )
  }

  this.jumpWordBeginning = () => {
    if (this.chordPrefix.endsWith('v')) this.switchTo("VISUAL BLOCK")
    const lineRightOf = (this.mode != "VISUAL BLOCK") ? this.lineRightOfCursor : this.lineRightOfSelection
    const move = (this.mode != "VISUAL BLOCK") ? client.cursor.move : client.cursor.scale
    const moveTo = (this.mode != "VISUAL BLOCK") ? client.cursor.moveTo : () => {
      if (this.mode != "VISUAL LINE") this.switchTo("VISUAL LINE")
    }

    while (true && this.mode !== "VISUAL LINE") {
      const line = lineRightOf().split('')
      let charUnderCursor = line[0]
      let moves = 0

      // Calculate the number of spaces we need to move until the next word, depending on what character we're currently on
      if (charUnderCursor === '.') {
        moves = line.findIndex(x => x != '.')
      } else {
        const movesUntilDot = line.indexOf('.')
        moves = movesUntilDot + line.slice(movesUntilDot).findIndex(x => x != '.')
      }

      // Test for two (literal) edge cases:
      // 1. Our cursor is over a word that extends until the end of the line. There are no more dots on this line, e.g. ...abc|
      // 2. Our cursor is over the last word in this line. There are no more words to the right of this word on this line, e.g. ..abc..|
      // In either case, our goal is to repeat the above search on the next line.
      if (moves === -1 || moves === line.length-1) {
        if (this.chordPrefix.endsWith('d')) {
          client.orca.writeBlock(client.cursor.x, client.cursor.y, ".".repeat(client.orca.w))
          client.history.record(client.orca.s)
          this.resetChord()
          break
        }

        // don't recurse past Orca's height
        if (client.cursor.y+1 >= client.orca.h) break

        moveTo(0, client.cursor.y+1)

        // don't recurse if we already found a new word, e.g. ..a| -> |b..
        if (client.cursor.read() != '.') break

        continue
      }

      if (this.chordPrefix.endsWith('d')) {
        const line = lineRightOf().substring(moves)
        client.orca.writeBlock(client.cursor.x, client.cursor.y, ".".repeat(client.orca.w))
        client.orca.writeBlock(client.cursor.x, client.cursor.y, line)
        client.history.record(client.orca.s)
        this.resetChord()
      } else {
        // Otherwise, simply just move the amount of spaces we calculated
        move(moves, 0)
      }
      break
    }
  }

  // After conditionally jumping to the next word's beginning, we know we're at a word character, so just find the next dot.
  // If no dot, then the word extends until the of the line, in which case, just move the line length.
  this.jumpWordEnding = () => {
    if (this.chordPrefix.endsWith('v')) this.switchTo("VISUAL BLOCK")
    const lineRightOf = (this.mode != "VISUAL BLOCK") ? this.lineRightOfCursor : this.lineRightOfSelection
    const move = (this.mode != "VISUAL BLOCK") ? client.cursor.move : client.cursor.scale

    let line = lineRightOf()

    const toDelete = this.chordPrefix.endsWith('d') // check this now in as jumpWordBeginning might do some for us

    // Find the next word if we're on a dot, or we're already at the end of our current word
    if (line[0] === '.' || line[1] === '.' || line[1] === '\n') {
      this.jumpWordBeginning()
      line = lineRightOf()
    }

    let moves = line.indexOf('.')

    if (moves === -1) {
      moves = line.length-1
    }

    if (toDelete) {
      const line = lineRightOf().substring(moves)
      client.orca.writeBlock(client.cursor.x, client.cursor.y, ".".repeat(client.orca.w))
      client.orca.writeBlock(client.cursor.x, client.cursor.y, line)
      this.resetChord()
    } else {
      move(moves-1, 0) // moves to the last character of the word
    }
  }

  this.jumpWordBack = () => {
    if (this.chordPrefix.endsWith('v')) this.switchTo("VISUAL BLOCK")
    const lineLeftOf = (this.mode != "VISUAL BLOCK") ? this.lineLeftOfCursor : this.lineLeftOfSelection
    const move = (this.mode != "VISUAL BLOCK") ? client.cursor.move : client.cursor.scale
    const moveTo = (this.mode != "VISUAL BLOCK") ? client.cursor.moveTo : () => {
      if (this.mode != "VISUAL LINE") this.switchTo("VISUAL LINE")
    }

    this.resetChord()

    while (true && this.mode !== "VISUAL LINE") {
      let line = [...lineLeftOf().split('').reverse().slice(1), '.']
      let charUnderCursor = line[0]
      let moves = 0

      // If we're at the start of a word  against the border, i.e. |abc.. with cursor over 'a'
      if (line.length == 2) {
        moveTo(client.orca.w, client.cursor.y-1)
        continue
      }

      if (charUnderCursor === '.') {
        const movesUntilWordEnd = line.findIndex(x => x != '.')
        moves = movesUntilWordEnd + line.slice(movesUntilWordEnd).indexOf('.')
      } else {
        moves = line.indexOf('.')
        // if we're at the start of a word already, we should go to the next one, so recurse
        if (moves == 1) {
          move(-1, 0)
          continue
        }
      }

      // If we're at the start of the word and there's nothing else on the line, i.e ...abc..| with cursor over 'a'
      if (moves === -1) {
        if (client.cursor.y <= 0) { moveTo(0, 0); break }
        moveTo(client.orca.w, client.cursor.y-1)
        continue
      }

      move(-moves+1, 0)
      break
    }
  }
}
