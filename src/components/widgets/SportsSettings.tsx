import { useWidgetSettings } from '@whiteboard/sdk'
import { FlexCol } from '../../ui/layouts'
import { Text, Input } from '../../ui/web'

interface SportsWidgetSettings {
  league:       'nfl' | 'nba'
  favoriteTeam: string
}

const NFL_TEAMS = ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS']
const NBA_TEAMS = ['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS']

const DEFAULTS: SportsWidgetSettings = { league: 'nfl', favoriteTeam: '' }

export function SportsSettings({ widgetId, league }: { widgetId: string; league: 'nfl' | 'nba' }) {
  const [settings, setSettings] = useWidgetSettings<SportsWidgetSettings>(widgetId, { ...DEFAULTS, league })
  const teams = league === 'nfl' ? NFL_TEAMS : NBA_TEAMS

  return (
    <FlexCol style={{ gap: 16, padding: 4 }}>
      <FlexCol style={{ gap: 8 }}>
        <Text variant="label" color="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Favorite Team
        </Text>
        <select
          value={settings.favoriteTeam}
          onChange={(e) => setSettings({ favoriteTeam: e.target.value })}
          style={{
            background:   'var(--wt-surface)',
            border:       '1px solid var(--wt-border)',
            borderRadius: 8,
            color:        'var(--wt-text)',
            padding:      '6px 10px',
            fontSize:     13,
            width:        '100%',
          }}
        >
          <option value="">None</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Text variant="caption" color="muted" style={{ fontSize: 11 }}>
          Your team's games will be highlighted
        </Text>
      </FlexCol>
    </FlexCol>
  )
}

export function NFLSettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="nfl" />
}

export function NBASettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="nba" />
}
