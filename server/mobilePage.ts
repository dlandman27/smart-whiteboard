// ── Mobile companion page ─────────────────────────────────────────────────────
// Served at GET /mobile — a self-contained Walli interface for phones.
// On the same WiFi: http://<board-ip>:3001/mobile
// Remotely via Tailscale: http://<tailscale-ip>:3001/mobile

export const MOBILE_PAGE = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>Walli</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0a0a0b;
    --surface:  #141416;
    --surface2: #1e1e22;
    --border:   rgba(255,255,255,0.08);
    --text:     #f0f0f0;
    --muted:    #666;
    --accent:   #3b82f6;
    --accent2:  #a855f7;
    --user-bg:  linear-gradient(135deg, #3b82f6, #6366f1);
    --walli-bg: #1e1e22;
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bot: env(safe-area-inset-bottom, 0px);
  }

  @media (prefers-color-scheme: light) {
    :root {
      --bg:       #f5f5f7;
      --surface:  #ffffff;
      --surface2: #f0f0f2;
      --border:   rgba(0,0,0,0.08);
      --text:     #1c1917;
      --muted:    #a0a0a0;
      --walli-bg: #f0f0f2;
    }
  }

  html, body {
    height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
  }

  #app {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: calc(var(--safe-top) + 16px);
    padding-bottom: calc(var(--safe-bot) + 16px);
  }

  /* Header */
  #header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 20px 16px;
    flex-shrink: 0;
  }
  #avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #a855f7);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  #header-text h1 { font-size: 18px; font-weight: 700; }
  #header-text p  { font-size: 12px; color: var(--muted); margin-top: 1px; }
  #status-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--muted);
    margin-left: auto; flex-shrink: 0;
    transition: background 0.3s;
  }
  #status-dot.listening { background: #22c55e; box-shadow: 0 0 8px #22c55e88; }
  #status-dot.thinking  { background: #f59e0b; box-shadow: 0 0 8px #f59e0b88; }
  #status-dot.speaking  { background: var(--accent); box-shadow: 0 0 8px #3b82f688; }

  /* Chat */
  #chat {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  #chat::-webkit-scrollbar { display: none; }

  .msg { display: flex; align-items: flex-end; gap: 8px; }
  .msg.user { justify-content: flex-end; }

  .bubble {
    max-width: 80%;
    padding: 10px 14px;
    border-radius: 18px;
    font-size: 15px;
    line-height: 1.5;
    word-break: break-word;
  }
  .bubble.user {
    background: var(--user-bg);
    color: #fff;
    border-radius: 18px 18px 4px 18px;
    box-shadow: 0 4px 14px rgba(59,130,246,0.35);
  }
  .bubble.walli {
    background: var(--walli-bg);
    border: 1px solid var(--border);
    border-radius: 18px 18px 18px 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .msg-avatar {
    width: 26px; height: 26px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #a855f7);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; flex-shrink: 0;
  }

  .typing { display: flex; gap: 5px; padding: 4px 2px; align-items: center; }
  .dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--muted);
    animation: bounce 1.2s ease-in-out infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1;   }
  }

  .empty-state {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 12px; color: var(--muted); text-align: center;
    padding: 40px 20px;
  }
  .empty-state .big-avatar {
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #a855f7);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px;
    box-shadow: 0 8px 32px rgba(59,130,246,0.3);
  }
  .empty-state h2 { font-size: 20px; font-weight: 700; color: var(--text); }
  .empty-state p  { font-size: 14px; max-width: 240px; }

  /* Input bar */
  #input-bar {
    flex-shrink: 0;
    padding: 12px 16px 0;
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }
  #text-input {
    flex: 1;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 22px;
    padding: 10px 16px;
    font-size: 15px;
    color: var(--text);
    outline: none;
    resize: none;
    max-height: 120px;
    line-height: 1.4;
    -webkit-appearance: none;
    font-family: inherit;
  }
  #text-input::placeholder { color: var(--muted); }
  #text-input:focus { border-color: rgba(59,130,246,0.4); }

  #send-btn {
    width: 42px; height: 42px; border-radius: 50%;
    background: var(--accent);
    border: none; cursor: pointer; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; color: #fff;
    box-shadow: 0 4px 14px rgba(59,130,246,0.4);
    transition: transform 0.1s, opacity 0.2s;
  }
  #send-btn:active { transform: scale(0.92); }
  #send-btn:disabled { opacity: 0.4; cursor: default; }

  /* Mic button */
  #mic-btn {
    width: 42px; height: 42px; border-radius: 50%;
    background: var(--surface2);
    border: 1px solid var(--border);
    cursor: pointer; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; transition: all 0.2s;
  }
  #mic-btn.active {
    background: linear-gradient(135deg, #ef4444, #f97316);
    border-color: transparent;
    box-shadow: 0 0 0 6px rgba(239,68,68,0.2);
    animation: mic-pulse 1.5s ease-in-out infinite;
  }
  @keyframes mic-pulse {
    0%, 100% { box-shadow: 0 0 0 4px rgba(239,68,68,0.2); }
    50%       { box-shadow: 0 0 0 10px rgba(239,68,68,0.05); }
  }
  #mic-btn:active { transform: scale(0.92); }

  .fade-in { animation: fadeIn 0.22s ease both; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
</head>
<body>
<div id="app">
  <div id="header">
    <div id="avatar">✦</div>
    <div id="header-text">
      <h1>Walli</h1>
      <p id="status-label">Tap mic to talk</p>
    </div>
    <div id="status-dot"></div>
  </div>

  <div id="chat">
    <div class="empty-state" id="empty">
      <div class="big-avatar">✦</div>
      <h2>Hey, I'm Walli</h2>
      <p>Your smart board assistant. Tap the mic or type to get started.</p>
    </div>
  </div>

  <div id="input-bar">
    <button id="mic-btn" title="Hold to talk">🎤</button>
    <textarea id="text-input" rows="1" placeholder="Ask Walli something…"></textarea>
    <button id="send-btn">↑</button>
  </div>
</div>

<script>
  const chat       = document.getElementById('chat')
  const empty      = document.getElementById('empty')
  const textInput  = document.getElementById('text-input')
  const sendBtn    = document.getElementById('send-btn')
  const micBtn     = document.getElementById('mic-btn')
  const statusDot  = document.getElementById('status-dot')
  const statusLabel = document.getElementById('status-label')

  let history = []
  let isProcessing = false
  let recognition = null
  let isListening = false
  let currentAudio = null

  // ── Status helpers ────────────────────────────────────────────────────────

  function setStatus(state) {
    statusDot.className = ''
    if (state) statusDot.classList.add(state)
    const labels = { idle: 'Tap mic to talk', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…' }
    statusLabel.textContent = labels[state] ?? 'Tap mic to talk'
  }

  // ── Chat rendering ────────────────────────────────────────────────────────

  function addMessage(role, text) {
    empty.style.display = 'none'
    const row = document.createElement('div')
    row.className = 'msg ' + role + ' fade-in'

    if (role === 'walli') {
      const av = document.createElement('div')
      av.className = 'msg-avatar'
      av.textContent = '✦'
      row.appendChild(av)
    }

    const bub = document.createElement('div')
    bub.className = 'bubble ' + role
    bub.textContent = text
    row.appendChild(bub)
    chat.appendChild(row)
    chat.scrollTop = chat.scrollHeight
    return bub
  }

  function addTyping() {
    empty.style.display = 'none'
    const row = document.createElement('div')
    row.className = 'msg walli fade-in'
    const av = document.createElement('div')
    av.className = 'msg-avatar'
    av.textContent = '✦'
    row.appendChild(av)
    const bub = document.createElement('div')
    bub.className = 'bubble walli'
    bub.innerHTML = '<div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>'
    row.appendChild(bub)
    chat.appendChild(row)
    chat.scrollTop = chat.scrollHeight
    return row
  }

  // ── TTS ───────────────────────────────────────────────────────────────────

  async function speak(text) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null }
    setStatus('speaking')
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const audio = new Audio(url)
      currentAudio = audio
      await new Promise((resolve) => {
        audio.onended = audio.onerror = () => { URL.revokeObjectURL(url); currentAudio = null; resolve() }
        audio.play().catch(resolve)
      })
    } catch {
      // fallback: browser TTS
      window.speechSynthesis?.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      await new Promise((resolve) => { utt.onend = utt.onerror = resolve; window.speechSynthesis.speak(utt) })
    }
    setStatus('idle')
  }

  // ── Send command ──────────────────────────────────────────────────────────

  async function send(text) {
    text = text.trim()
    if (!text || isProcessing) return
    isProcessing = true

    addMessage('user', text)
    history.push({ role: 'user', content: text })
    const typing = addTyping()
    setStatus('thinking')

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, history: history.slice(0, -1) }),
      })
      const data = await res.json()
      const reply = data.response || 'Done.'
      history.push({ role: 'assistant', content: reply })
      chat.removeChild(typing)
      addMessage('walli', reply)
      await speak(reply)
    } catch {
      chat.removeChild(typing)
      addMessage('walli', 'Something went wrong. Try again.')
      setStatus('idle')
    }

    isProcessing = false
  }

  // ── Text input ────────────────────────────────────────────────────────────

  textInput.addEventListener('input', () => {
    textInput.style.height = 'auto'
    textInput.style.height = Math.min(textInput.scrollHeight, 120) + 'px'
  })
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const val = textInput.value
      textInput.value = ''
      textInput.style.height = 'auto'
      send(val)
    }
  })
  sendBtn.addEventListener('click', () => {
    const val = textInput.value
    textInput.value = ''
    textInput.style.height = 'auto'
    send(val)
  })

  // ── Voice input ───────────────────────────────────────────────────────────

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SR) {
    recognition = new SR()
    recognition.continuous     = false
    recognition.interimResults = true
    recognition.lang           = 'en-US'

    let interim = ''
    let final   = ''

    recognition.onresult = (e) => {
      interim = ''
      final   = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      textInput.value = final || interim
      textInput.style.height = 'auto'
      textInput.style.height = Math.min(textInput.scrollHeight, 120) + 'px'
    }

    recognition.onend = () => {
      isListening = false
      micBtn.classList.remove('active')
      const text = textInput.value.trim()
      if (text) {
        textInput.value = ''
        textInput.style.height = 'auto'
        send(text)
      } else {
        setStatus('idle')
      }
    }

    recognition.onerror = () => {
      isListening = false
      micBtn.classList.remove('active')
      setStatus('idle')
    }

    micBtn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop()
      } else if (!isProcessing) {
        isListening = true
        micBtn.classList.add('active')
        setStatus('listening')
        textInput.value = ''
        try { recognition.start() } catch { /* already running */ }
      }
    })
  } else {
    // No speech support — hide mic button
    micBtn.style.display = 'none'
  }

  setStatus('idle')
</script>
</body>
</html>`
