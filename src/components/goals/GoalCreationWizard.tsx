import { useState, useRef, useEffect } from 'react'
import {
  Button, IconButton, Text, FlexRow, FlexCol,
} from '@whiteboard/ui-kit'
import {
  useParseGoal, useCreateGoal, useCreateMilestone,
  type ParsedGoal, type ParseMessage, type CreateGoalInput,
} from '../../hooks/useGoals'

const EXAMPLES = [
  'Lose 30 lbs by summer',
  'Read 24 books this year',
  'Build a morning routine',
  'Launch my side project',
]

const TYPE_LABELS: Record<string, string> = {
  numeric:   'Numeric',
  average:   'Average',
  habit:     'Habit',
  milestone: 'Milestone',
}

const COLORS = ['#3b82f6','#8b5cf6','#f97316','#10b981','#ec4899','#f59e0b','#06b6d4','#ef4444']

interface Props {
  onDone:   () => void
  onCancel: () => void
}

type Step = 'input' | 'thinking' | 'question' | 'preview'

export function GoalCreationWizard({ onDone, onCancel }: Props) {
  const [step,        setStep]        = useState<Step>('input')
  const [inputText,   setInputText]   = useState('')
  const [question,    setQuestion]    = useState('')
  const [answer,      setAnswer]      = useState('')
  const [messages,    setMessages]    = useState<ParseMessage[]>([])
  const [parsed,      setParsed]      = useState<ParsedGoal | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [emoji,       setEmoji]       = useState('')
  const [color,       setColor]       = useState('')
  const [startValue,  setStartValue]  = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [unit,        setUnit]        = useState('')
  const [targetDate,  setTargetDate]  = useState('')
  const [milestones,  setMilestones]  = useState<string[]>([])

  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const answerRef = useRef<HTMLInputElement>(null)
  const parseGoal      = useParseGoal()
  const createGoal     = useCreateGoal()
  const createMilestone = useCreateMilestone()

  useEffect(() => {
    if (step === 'input')    inputRef.current?.focus()
    if (step === 'question') answerRef.current?.focus()
  }, [step])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  function applyParsed(data: ParsedGoal) {
    setParsed(data)
    setTitle(data.title)
    setDescription(data.description ?? '')
    setEmoji(data.emoji)
    setColor(data.color)
    setStartValue(data.start_value  != null ? String(data.start_value)  : '')
    setTargetValue(data.target_value != null ? String(data.target_value) : '')
    setUnit(data.unit ?? '')
    setTargetDate(data.target_date ?? '')
    setMilestones(data.milestones ?? [])
    setStep('preview')
  }

  function sendMessages(msgs: ParseMessage[]) {
    setMessages(msgs)
    setError(null)
    setStep('thinking')
    parseGoal.mutate(msgs, {
      onSuccess: (result) => {
        if (result.type === 'question') {
          setQuestion(result.question)
          setStep('question')
        } else {
          applyParsed(result.data)
        }
      },
      onError: () => {
        setError('Something went wrong. Try rephrasing.')
        setStep('input')
      },
    })
  }

  function handleInitialSubmit() {
    const t = inputText.trim()
    if (!t) return
    sendMessages([{ role: 'user', content: t }])
  }

  function handleAnswerSubmit() {
    const a = answer.trim()
    if (!a) return
    sendMessages([
      ...messages,
      { role: 'assistant', content: question },
      { role: 'user',      content: a },
    ])
    setAnswer('')
  }

  async function handleCreate() {
    if (!parsed || !title.trim()) return
    const input: CreateGoalInput = {
      title:        title.trim(),
      description:  description.trim() || null,
      type:         parsed.type,
      emoji,
      color,
      unit:         unit.trim() || null,
      start_value:  startValue  ? Number(startValue)  : null,
      target_value: targetValue ? Number(targetValue) : null,
      target_date:  targetDate  || null,
    }
    createGoal.mutate(input, {
      onSuccess: (goal) => {
        milestones.filter(m => m.trim()).forEach(m =>
          createMilestone.mutate({ goalId: goal.id, title: m.trim() })
        )
        onDone()
      },
    })
  }

  const isThinking = step === 'thinking'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >

      {/* ── Input / thinking ── */}
      {(step === 'input' || step === 'thinking') && (
        <FlexCol align="center" gap="none" className="gap-7" style={{ width: '100%', maxWidth: 600, animation: 'fadeIn 0.2s ease' }}>
          <Text
            variant="display" size="small"
            align="center"
            style={{ color: 'white', letterSpacing: '-0.03em', textShadow: '0 2px 20px rgba(0,0,0,0.4)', lineHeight: 1.1 }}
          >
            What do you want<br />to achieve?
          </Text>

          <div style={{ width: '100%', background: 'var(--wt-bg)', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && step === 'input') {
                  e.preventDefault()
                  if (inputText.trim()) handleInitialSubmit()
                }
              }}
              placeholder="I want to…"
              rows={3}
              disabled={isThinking}
              style={{
                width: '100%', padding: '24px 24px 12px',
                fontSize: 22, fontWeight: 500, lineHeight: 1.4,
                color: 'var(--wt-text)', background: 'transparent',
                border: 'none', outline: 'none', resize: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
                opacity: isThinking ? 0.5 : 1,
              }}
            />
            <FlexRow align="center" justify="between" style={{ padding: '0 16px 16px' }}>
              <Text variant="caption" color="muted" style={{ opacity: 0.6 }}>
                {isThinking ? 'Thinking…' : 'Enter to continue'}
              </Text>
              <WizardSubmitButton
                onClick={handleInitialSubmit}
                disabled={!inputText.trim() || isThinking}
                loading={isThinking}
              />
            </FlexRow>
          </div>

          {error && (
            <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 13, textAlign: 'center', width: '100%' }}>
              {error}
            </div>
          )}

          {step === 'input' && (
            <FlexRow wrap justify="center" gap="sm">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => { setInputText(ex); inputRef.current?.focus() }}
                  style={{
                    padding: '7px 14px', borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)',
                    fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(4px)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                >
                  {ex}
                </button>
              ))}
            </FlexRow>
          )}
        </FlexCol>
      )}

      {/* ── Clarifying question ── */}
      {step === 'question' && (
        <FlexCol align="center" gap="none" className="gap-7" style={{ width: '100%', maxWidth: 600, animation: 'fadeIn 0.2s ease' }}>
          <Text variant="body" size="medium" align="center" style={{ color: 'rgba(255,255,255,0.5)' }}>
            "{inputText}"
          </Text>

          <Text
            variant="heading" size="large"
            align="center"
            style={{ color: 'white', letterSpacing: '-0.02em', textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
          >
            {question}
          </Text>

          <div style={{ width: '100%', background: 'var(--wt-bg)', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <input
              ref={answerRef}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && answer.trim()) handleAnswerSubmit() }}
              placeholder="Type your answer…"
              style={{
                width: '100%', padding: '20px 24px 12px',
                fontSize: 18, fontWeight: 500,
                color: 'var(--wt-text)', background: 'transparent',
                border: 'none', outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <FlexRow align="center" justify="between" style={{ padding: '0 16px 16px' }}>
              <Button
                variant="link" size="sm"
                style={{ color: 'var(--wt-text-muted)', opacity: 0.7 }}
                onClick={() => { setStep('input'); setQuestion(''); setAnswer('') }}
              >
                ← Start over
              </Button>
              <WizardSubmitButton onClick={handleAnswerSubmit} disabled={!answer.trim()} loading={false} />
            </FlexRow>
          </div>
        </FlexCol>
      )}

      {/* ── Preview ── */}
      {step === 'preview' && parsed && (
        <FlexCol align="center" gap="none" className="gap-5" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', animation: 'fadeIn 0.25s ease' }}>

          <Text
            variant="label" size="small"
            align="center"
            style={{ color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            Here's what I came up with
          </Text>

          {/* Goal card — looks exactly like what'll appear on the board */}
          <div style={{
            width: '100%', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)',
            borderRadius: 24,
            background: 'var(--wt-bg)',
            border: '1px solid var(--wt-widget-rest-border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 var(--wt-widget-highlight)',
            display: 'flex', overflow: 'hidden',
          }}>
            {/* Color stripe */}
            <div style={{ width: 8, background: color, flexShrink: 0 }} />

            <FlexCol style={{ flex: 1, minWidth: 0, padding: '20px 20px 16px', gap: 14 }}>

              {/* Emoji + editable title + description */}
              <FlexRow align="start" gap="sm">
                <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
                <FlexCol flex1 style={{ minWidth: 0, gap: 4 }}>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{
                      fontSize: 18, fontWeight: 700, lineHeight: 1.2,
                      color: 'var(--wt-text)', background: 'transparent',
                      border: 'none', borderBottom: '1.5px solid transparent',
                      outline: 'none', width: '100%', fontFamily: 'inherit',
                      padding: '1px 0', transition: 'border-color 0.15s',
                    }}
                    onFocus={e  => (e.currentTarget.style.borderBottomColor = color)}
                    onBlur={e   => (e.currentTarget.style.borderBottomColor = 'transparent')}
                  />
                  <input
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Add a description…"
                    style={{
                      fontSize: 12, color: 'var(--wt-text-muted)',
                      background: 'transparent', border: 'none',
                      borderBottom: '1.5px solid transparent',
                      outline: 'none', width: '100%', fontFamily: 'inherit',
                      padding: '1px 0', transition: 'border-color 0.15s',
                    }}
                    onFocus={e => (e.currentTarget.style.borderBottomColor = 'var(--wt-border)')}
                    onBlur={e  => (e.currentTarget.style.borderBottomColor = 'transparent')}
                  />
                </FlexCol>
              </FlexRow>

              {/* Numeric / average: start → target with unit */}
              {(parsed.type === 'numeric' || parsed.type === 'average') && (
                <FlexRow gap="sm" align="center">
                  <FlexCol align="center" style={{ gap: 2 }}>
                    <Text variant="caption" color="muted">From</Text>
                    <input
                      type="number"
                      value={startValue}
                      onChange={e => setStartValue(e.target.value)}
                      placeholder="—"
                      style={{
                        width: 72, textAlign: 'center',
                        fontSize: 20, fontWeight: 700, color: 'var(--wt-text)',
                        background: 'var(--wt-surface)', border: '1px solid var(--wt-border)',
                        borderRadius: 10, outline: 'none', fontFamily: 'inherit', padding: '6px 4px',
                      }}
                    />
                  </FlexCol>
                  <Text variant="body" size="small" color="muted" style={{ paddingTop: 18 }}>→</Text>
                  <FlexCol align="center" style={{ gap: 2 }}>
                    <Text variant="caption" color="muted">To</Text>
                    <input
                      type="number"
                      value={targetValue}
                      onChange={e => setTargetValue(e.target.value)}
                      placeholder="—"
                      style={{
                        width: 72, textAlign: 'center',
                        fontSize: 20, fontWeight: 700, color,
                        background: `${color}12`, border: `1px solid ${color}40`,
                        borderRadius: 10, outline: 'none', fontFamily: 'inherit', padding: '6px 4px',
                      }}
                    />
                  </FlexCol>
                  <FlexCol style={{ gap: 2, paddingTop: 20 }}>
                    <input
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      placeholder="unit"
                      style={{
                        width: 60, fontSize: 13, color: 'var(--wt-text-muted)',
                        background: 'transparent', border: 'none',
                        borderBottom: '1.5px solid var(--wt-border)',
                        outline: 'none', fontFamily: 'inherit', padding: '2px 0',
                      }}
                    />
                  </FlexCol>
                </FlexRow>
              )}

              {/* Milestones preview */}
              {milestones.length > 0 && (
                <FlexCol gap="xs">
                  {milestones.slice(0, 5).map((m, i) => (
                    <FlexRow key={i} align="center" gap="sm">
                      <div style={{
                        width: 13, height: 13, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${color}40`,
                      }} />
                      <input
                        value={m}
                        onChange={e => setMilestones(ms => ms.map((x, j) => j === i ? e.target.value : x))}
                        style={{
                          flex: 1, fontSize: 13, color: 'var(--wt-text)',
                          background: 'transparent', border: 'none',
                          borderBottom: '1px solid transparent',
                          outline: 'none', fontFamily: 'inherit', padding: '1px 0',
                          transition: 'border-color 0.15s',
                        }}
                        onFocus={e => (e.currentTarget.style.borderBottomColor = 'var(--wt-border)')}
                        onBlur={e  => (e.currentTarget.style.borderBottomColor = 'transparent')}
                      />
                    </FlexRow>
                  ))}
                </FlexCol>
              )}

              {/* Footer row */}
              <FlexRow align="center" justify="between" style={{ marginTop: 'auto' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: color + '20', color,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {TYPE_LABELS[parsed.type]}
                </span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  style={{
                    fontSize: 11, color: targetDate ? 'var(--wt-text-muted)' : 'var(--wt-border)',
                    background: 'transparent', border: 'none',
                    outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
                  }}
                />
              </FlexRow>

            </FlexCol>
          </div>

          {/* Color + actions */}
          <FlexRow align="center" justify="between" style={{ width: '100%', padding: '0 4px' }}>
            <FlexRow gap="xs">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 20, height: 20, borderRadius: 5, border: 'none',
                    background: c, cursor: 'pointer', flexShrink: 0,
                    boxShadow: color === c ? `0 0 0 2px rgba(0,0,0,0.6), 0 0 0 4px ${c}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
              ))}
            </FlexRow>

            <FlexRow gap="sm">
              <button
                onClick={() => { setStep('input'); setParsed(null) }}
                style={{
                  padding: '9px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                }}
              >
                ← Try again
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim() || createGoal.isPending}
                style={{
                  padding: '9px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  border: 'none',
                  background: title.trim() ? color : 'var(--wt-border)',
                  color: 'white',
                  cursor: title.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: title.trim() ? `0 4px 20px ${color}55` : 'none',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {createGoal.isPending ? 'Creating…' : 'Create goal →'}
              </button>
            </FlexRow>
          </FlexRow>

        </FlexCol>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

// ── Wizard submit button ───────────────────────────────────────────────────────

function WizardSubmitButton({ onClick, disabled, loading }: { onClick: () => void; disabled: boolean; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 18px', borderRadius: 12, border: 'none',
        background: disabled ? 'var(--wt-border)' : 'var(--wt-accent)',
        color:      disabled ? 'var(--wt-text-muted)' : 'var(--wt-accent-text)',
        fontSize: 14, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {loading ? (
        <>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
            <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={2.5} strokeOpacity={0.25} />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
          </svg>
          Thinking
        </>
      ) : (
        <>
          Continue
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      )}
    </button>
  )
}
