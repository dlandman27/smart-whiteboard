import { useWidgetSettings } from '@whiteboard/sdk'
import { FlexCol, Text, SettingsSection, SegmentedControl } from '@whiteboard/ui-kit'
import type { League } from '../../hooks/useSports'

type View = 'scores' | 'standings'

interface SportsWidgetSettings {
  league:       League
  view:         View
  favoriteTeam: string
}

const TEAMS: Partial<Record<League, string[]>> = {
  nfl: ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'],
  nba: ['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS'],
  nhl: ['ANA','ARI','BOS','BUF','CAR','CBJ','CGY','CHI','COL','DAL','DET','EDM','FLA','LA','MIN','MTL','NJ','NSH','NYI','NYR','OTT','PHI','PIT','SEA','SJ','STL','TB','TOR','VAN','VGK','WAS','WPG'],
  mlb: ['ARI','ATL','BAL','BOS','CHC','CIN','CLE','COL','CWS','DET','HOU','KC','LAA','LAD','MIA','MIL','MIN','NYM','NYY','OAK','PHI','PIT','SD','SEA','SF','STL','TB','TEX','TOR','WAS'],
  premierleague: ['ARS','AVL','BOU','BRE','BHA','CHE','CRY','EVE','FUL','IPS','LEI','LIV','MCI','MUN','NEW','NFO','SOU','TOT','WHU','WOL'],
  laliga: ['ATM','BAR','CEL','GIR','GET','LPA','MAL','OSA','RAY','RMA','RSO','SEV','VAL','VIL','BET','ALA','ESP','VAD','LEG','ATH'],
  bundesliga: ['BAY','BVB','LEV','RBL','SGE','SCF','WOB','BMG','TSG','VFB','SVW','BOC','FCU','M05','FCA','KOE','HDH','DAR'],
  seriea: ['ATA','BOL','CAG','COM','EMP','FIO','GEN','INT','JUV','LAZ','LEC','MIL','MON','NAP','PAR','ROM','SAL','SAS','TOR','UDI','VEN','VER'],
}

function SportsSettings({ widgetId, league }: { widgetId: string; league: League }) {
  const [settings, setSettings] = useWidgetSettings<SportsWidgetSettings>(widgetId, {
    league,
    view: 'scores',
    favoriteTeam: '',
  })
  const teams = TEAMS[league] ?? []

  return (
    <SettingsSection label="Settings">
      <FlexCol gap="sm">
        <Text variant="label" size="small" color="muted" textTransform="uppercase" style={{ letterSpacing: '0.06em' }}>
          Default View
        </Text>
        <SegmentedControl
          value={settings.view ?? 'scores'}
          options={[
            { value: 'scores' as View, label: 'Scores' },
            { value: 'standings' as View, label: 'Standings' },
          ]}
          onChange={(v) => setSettings({ view: v })}
        />

        <Text variant="label" size="small" color="muted" textTransform="uppercase" style={{ letterSpacing: '0.06em', marginTop: 8 }}>
          Favorite Team
        </Text>
        <select
          value={settings.favoriteTeam}
          onChange={(e) => setSettings({ favoriteTeam: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
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
        <Text variant="caption" color="muted" size="small">
          Your team will be highlighted in scores and standings
        </Text>
      </FlexCol>
    </SettingsSection>
  )
}

export function NFLSettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="nfl" />
}

export function NBASettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="nba" />
}

export function NHLSettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="nhl" />
}

export function MLBSettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="mlb" />
}

export function EPLSettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="premierleague" />
}

export function LaLigaSettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="laliga" />
}

export function UCLSettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="ucl" />
}

export function BundesligaSettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="bundesliga" />
}

export function SerieASettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="seriea" />
}

export function Ligue1Settings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="ligue1" />
}

export function MLSSettings({ widgetId }: { widgetId: string }) {
  return <SportsSettings widgetId={widgetId} league="mls" />
}
