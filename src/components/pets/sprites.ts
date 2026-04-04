// ── Pixel art sprite definitions ───────────────────────────────────────────────
// 8-wide strings, each char = 1 pixel. ' '=transparent, any other char = a layer color.
// Two walk frames per character (legs alternate). Idle frame = frame 0.
// Colors: B=body, D=dark/outline, E=eye, S=skin, A=accent

export type Frame  = string[]                           // array of 8-char rows
export type Sprite = { frames: [Frame, Frame, Frame]; colors: Record<string, string>; width: number; height: number }

export const PX = 4  // each pixel = 4px

export const SPRITES: Record<string, Sprite> = {
  cat: {
    colors: { D: '#111', B: '#c084fc', E: '#34d399', S: '#e9d5ff', A: '#7e22ce' },
    width: 8, height: 10,
    frames: [
      ['D     D ', 'DD   DD ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBBSBBD ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['D     D ', 'DD   DD ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBBSBBD ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['D     D ', 'DD   DD ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBBSBBD ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  dog: {
    colors: { D: '#111', B: '#f97316', E: '#fff', S: '#fde68a', A: '#c2410c' },
    width: 8, height: 10,
    frames: [
      [' DDDDDD ', 'DBBBBBD ', 'BSSSSBD ', 'BSESSD  ', 'BSSASBD ', ' DDDDD  ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' DDDDDD ', 'DBBBBBD ', 'BSSSSBD ', 'BSESSD  ', 'BSSASBD ', ' DDDDD  ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' DDDDDD ', 'DBBBBBD ', 'BSSSSBD ', 'BSESSD  ', 'BSSASBD ', ' DDDDD  ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  robot: {
    colors: { D: '#111', B: '#60a5fa', E: '#fbbf24', S: '#93c5fd', A: '#2563eb' },
    width: 8, height: 10,
    frames: [
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DAEAEBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DAEAEBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DAEAEBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  bunny: {
    colors: { D: '#111', B: '#f9a8d4', E: '#ec4899', S: '#fce7f3', A: '#db2777' },
    width: 8, height: 11,
    frames: [
      [' DS  SD ', ' DB  BD ', ' DB  BD ', 'DBBBBBD ', 'DBSESBD ', 'DBBBBBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' DS  SD ', ' DB  BD ', ' DB  BD ', 'DBBBBBD ', 'DBSESBD ', 'DBBBBBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' DS  SD ', ' DB  BD ', ' DB  BD ', 'DBBBBBD ', 'DBSESBD ', 'DBBBBBD ', 'DBBBBBD ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  ghost: {
    colors: { D: '#334155', B: '#cbd5e1', E: '#1e293b', S: '#f1f5f9', A: '#64748b' },
    width: 8, height: 10,
    frames: [
      ['  DDDD  ', ' DSSSD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', 'DSSSSSD ', 'DSSSSSSD', 'D S S SD', '        ', '        '],
      ['  DDDD  ', ' DSSSD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', 'DSSSSSD ', ' DSSSSD ', '  DS SD ', '        ', '        '],
      ['  DDDD  ', ' DSSSD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', 'DSSSSSD ', 'DSSSSSSD', 'DS S S D', '        ', '        '],
    ],
  },
  owl: {
    colors: { D: '#111', B: '#78350f', E: '#fbbf24', S: '#fef3c7', A: '#d97706' },
    width: 8, height: 10,
    frames: [
      [' D    D ', 'DBBBBBD ', 'DASASD  ', 'DAESAED ', 'DSSSSSD ', ' DAABD  ', ' DBBBD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' D    D ', 'DBBBBBD ', 'DASASD  ', 'DAESAED ', 'DSSSSSD ', ' DAABD  ', ' DBBBD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' D    D ', 'DBBBBBD ', 'DASASD  ', 'DAESAED ', 'DSSSSSD ', ' DAABD  ', ' DBBBD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  bear: {
    colors: { D: '#111', B: '#92400e', E: '#fff', S: '#fbbf24', A: '#451a03' },
    width: 8, height: 10,
    frames: [
      [' DB BD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DASAD  ', ' DBBBD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' DB BD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DASAD  ', ' DBBBD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' DB BD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DASAD  ', ' DBBBD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  frog: {
    colors: { D: '#111', B: '#22c55e', E: '#fff', S: '#bbf7d0', A: '#15803d' },
    width: 8, height: 10,
    frames: [
      ['DEBBBBED', 'DBBBBBD ', 'DSSSSSD ', 'DB A ABD', 'DSSSSSD ', ' DBBBD  ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['DEBBBBED', 'DBBBBBD ', 'DSSSSSD ', 'DB A ABD', 'DSSSSSD ', ' DBBBD  ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['DEBBBBED', 'DBBBBBD ', 'DSSSSSD ', 'DB A ABD', 'DSSSSSD ', ' DBBBD  ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  penguin: {
    colors: { D: '#0f172a', B: '#0f172a', E: '#f8fafc', S: '#f8fafc', A: '#f97316' },
    width: 8, height: 10,
    frames: [
      ['  DDDD  ', ' DSSSD  ', 'DBSSSBD ', 'DBSASD  ', 'DB AABD ', ' DSSSD  ', 'DBSSSBD ', 'DBBBBBD ', 'DAD DAD ', '        '],
      ['  DDDD  ', ' DSSSD  ', 'DBSSSBD ', 'DBSASD  ', 'DB AABD ', ' DSSSD  ', 'DBSSSBD ', 'DBBBBBD ', 'DAD  A  ', '        '],
      ['  DDDD  ', ' DSSSD  ', 'DBSSSBD ', 'DBSASD  ', 'DB AABD ', ' DSSSD  ', 'DBSSSBD ', 'DBBBBBD ', ' A  DAD ', '        '],
    ],
  },
  alien: {
    colors: { D: '#111', B: '#4ade80', E: '#111', S: '#dcfce7', A: '#86efac' },
    width: 8, height: 10,
    frames: [
      [' D   D  ', ' DB DBD ', ' DBBBD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', ' DBBBD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' D   D  ', ' DB DBD ', ' DBBBD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', ' DBBBD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' D   D  ', ' DB DBD ', ' DBBBD  ', 'DSSSSSD ', 'DSESESD ', 'DSSSSSD ', ' DBBBD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  dragon: {
    colors: { D: '#111', B: '#7f1d1d', E: '#fbbf24', S: '#fde68a', A: '#b91c1c' },
    width: 8, height: 10,
    frames: [
      ['D  D  D ', ' DBBBD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['D  D  D ', ' DBBBD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['D  D  D ', ' DBBBD  ', 'DBBBBBD ', 'DBBBBBD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  fox: {
    colors: { D: '#111', B: '#ea580c', E: '#fff', S: '#fed7aa', A: '#7c2d12' },
    width: 8, height: 10,
    frames: [
      ['D     D ', 'DA   AD ', 'DBBBBBD ', 'DBBBBBD ', 'DBSESBD ', 'DBSSSD  ', ' DBBBD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['D     D ', 'DA   AD ', 'DBBBBBD ', 'DBBBBBD ', 'DBSESBD ', 'DBSSSD  ', ' DBBBD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['D     D ', 'DA   AD ', 'DBBBBBD ', 'DBBBBBD ', 'DBSESBD ', 'DBSSSD  ', ' DBBBD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  wizard: {
    colors: { D: '#111', B: '#7c3aed', E: '#fbbf24', S: '#ddd6fe', A: '#4c1d95' },
    width: 8, height: 12,
    frames: [
      ['   D    ', '  DBD   ', ' DBBBD  ', 'DBBBBBD ', 'DSSSSSD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['   D    ', '  DBD   ', ' DBBBD  ', 'DBBBBBD ', 'DSSSSSD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['   D    ', '  DBD   ', ' DBBBD  ', 'DBBBBBD ', 'DSSSSSD ', 'DB E EBD', 'DBSSSD  ', ' DAAAD  ', 'DBBBBBD ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  ninja: {
    colors: { D: '#0f0f0f', B: '#1e1b4b', E: '#ef4444', S: '#3730a3', A: '#ef4444' },
    width: 8, height: 10,
    frames: [
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DBSSSBD ', 'DB E EBD', 'DBBBBBD ', ' DBBBD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DBSSSBD ', 'DB E EBD', 'DBBBBBD ', ' DBBBD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['  DDDD  ', ' DBBBD  ', 'DBBBBBD ', 'DBSSSBD ', 'DB E EBD', 'DBBBBBD ', ' DBBBD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  dino: {
    colors: { D: '#111', B: '#16a34a', E: '#fff', S: '#86efac', A: '#15803d' },
    width: 8, height: 10,
    frames: [
      ['D D D   ', 'DBBBBBD ', 'DBBBBBD ', 'DBBSSBD ', 'DB E BD ', 'DBBSSBD ', ' DAAAD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      ['D D D   ', 'DBBBBBD ', 'DBBBBBD ', 'DBBSSBD ', 'DB E BD ', 'DBBSSBD ', ' DAAAD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      ['D D D   ', 'DBBBBBD ', 'DBBBBBD ', 'DBBSSBD ', 'DB E BD ', 'DBBSSBD ', ' DAAAD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
  astronaut: {
    colors: { D: '#111', B: '#f1f5f9', E: '#38bdf8', S: '#cbd5e1', A: '#0284c7' },
    width: 8, height: 10,
    frames: [
      [' DDDDDD ', 'DBBBBBD ', 'DBAABBD ', 'DBAAABS ', 'DBAAABD ', 'DBBBBBD ', ' DSSSD  ', 'DBBBBBD ', ' DD DD  ', '        '],
      [' DDDDDD ', 'DBBBBBD ', 'DBAABBD ', 'DBAAABS ', 'DBAAABD ', 'DBBBBBD ', ' DSSSD  ', 'DBBBBBD ', 'DD   D  ', '        '],
      [' DDDDDD ', 'DBBBBBD ', 'DBAABBD ', 'DBAAABS ', 'DBAAABD ', 'DBBBBBD ', ' DSSSD  ', 'DBBBBBD ', ' D   DD ', '        '],
    ],
  },
}

export function getSpriteType(agentId: string, icon: string, spriteType?: string): keyof typeof SPRITES {
  if (spriteType && SPRITES[spriteType as keyof typeof SPRITES]) return spriteType as keyof typeof SPRITES
  if (agentId === 'task-monitor')       return 'dog'
  if (agentId === 'calendar-agent')     return 'cat'
  if (agentId === 'focus-agent')        return 'robot'
  if (agentId === 'routine-agent')      return 'bunny'
  if (agentId === 'meeting-countdown')  return 'owl'
  if (agentId === 'end-of-day')         return 'bear'
  if (agentId === 'stale-task-cleanup') return 'ghost'
  if (agentId === 'hydration-reminder') return 'frog'
  if (agentId === 'break-reminder')     return 'bunny'
  const iconMap: Record<string, keyof typeof SPRITES> = {
    '🐱':'cat','🐶':'dog','🤖':'robot','🐰':'bunny','👻':'ghost',
    '🦉':'owl','🐻':'bear','🐸':'frog','🐧':'penguin','👽':'alien',
    '🐉':'dragon','🦊':'fox','🧙':'wizard','🥷':'ninja','🦕':'dino','👨‍🚀':'astronaut',
  }
  if (iconMap[icon]) return iconMap[icon]
  const types = Object.keys(SPRITES) as (keyof typeof SPRITES)[]
  return types[agentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % types.length]
}
