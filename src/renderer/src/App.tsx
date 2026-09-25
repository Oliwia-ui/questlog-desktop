import { useEffect, useMemo, useRef, useState } from 'react'
import {
  filterQuests,
  getTodaysJourney,
  localDateString,
  questReference,
  type Quest
} from '../../shared/domain'
import type { AppSnapshot, CreateQuestRequest, MutationResult } from '../../shared/state'

type View = 'active' | 'today' | 'archive' | 'settings'
type FormValues = CreateQuestRequest

const emptyForm: FormValues = {
  title: '',
  description: '',
  course: '',
  dueDate: null,
  important: false
}

const viewCopy: Record<View, { kicker: string; title: string; subtitle: string }> = {
  active: {
    kicker: 'Chapter I',
    title: 'Active Quests',
    subtitle: 'All open tasks in your enchanted archive'
  },
  today: {
    kicker: 'Chapter II',
    title: "Today's Journey",
    subtitle: 'Overdue, due-today, and important quests'
  },
  archive: {
    kicker: 'Chapter III',
    title: 'Quest Archive',
    subtitle: 'Completed work, ready to revisit'
  },
  settings: {
    kicker: 'Archive ledger',
    title: 'Settings',
    subtitle: 'Local storage, Obsidian vault, and logging status'
  }
}

function App(): React.JSX.Element {
  const [state, setState] = useState<AppSnapshot | null>(null)
  const [view, setView] = useState<View>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [query, setQuery] = useState('')
  const [course, setCourse] = useState('all')
  const [warning, setWarning] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Quest | null>(null)
  const deleteDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    void window.questLog.loadState().then((loaded) => {
      setState(loaded)
      setSelectedId(loaded.quests.find((quest) => quest.status === 'active')?.id ?? null)
      if (loaded.pendingLogEvents.length)
        setWarning(`${loaded.pendingLogEvents.length} history event(s) await retry.`)
    })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const active = state?.quests.filter((quest) => quest.status === 'active') ?? []
  const archived = state?.quests.filter((quest) => quest.status === 'completed') ?? []
  const today = useMemo(
    () => getTodaysJourney(state?.quests ?? [], localDateString(new Date())),
    [state]
  )
  const courses = useMemo(
    () => [...new Set((state?.quests ?? []).map((quest) => quest.course).filter(Boolean))].sort(),
    [state]
  )
  const viewQuests = view === 'archive' ? archived : view === 'today' ? today : active
  const displayedQuests = filterQuests(viewQuests, { query, course, status: 'all' })
  const selected = state?.quests.find((quest) => quest.id === selectedId) ?? null

  function applyResult(result: MutationResult, message: string): void {
    setState(result.state)
    setWarning(result.warning)
    setToast(result.warning ? `${message} History logging needs attention.` : message)
  }

  async function mutate(action: () => Promise<MutationResult>, message: string): Promise<void> {
    setBusy(true)
    try {
      applyResult(await action(), message)
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : 'The archive could not complete that action.'
      )
    } finally {
      setBusy(false)
    }
  }

  function chooseQuest(quest: Quest): void {
    setSelectedId(quest.id)
    setCreating(false)
    setForm({
      title: quest.title,
      description: quest.description,
      course: quest.course,
      dueDate: quest.dueDate,
      important: quest.important
    })
  }

  function beginCreate(): void {
    setSelectedId(null)
    setCreating(true)
    setForm(emptyForm)
  }

  async function submitForm(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!form.title.trim()) return
    if (creating) {
      await mutate(async () => {
        const result = await window.questLog.createQuest(form)
        const created = result.state.quests.at(-1)
        setSelectedId(created?.id ?? null)
        setCreating(false)
        return result
      }, `Created “${form.title.trim()}”.`)
    } else if (selected) {
      await mutate(
        () => window.questLog.updateQuest({ id: selected.id, ...form }),
        `Saved “${form.title.trim()}”.`
      )
    }
  }

  async function copyReference(quest: Quest): Promise<void> {
    const reference = questReference(quest)
    try {
      await navigator.clipboard.writeText(reference)
      setToast('Quest reference copied.')
    } catch {
      setToast(`Copy this reference: ${reference}`)
    }
  }

  function requestDelete(quest: Quest): void {
    setDeleteTarget(quest)
    deleteDialog.current?.showModal()
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return
    deleteDialog.current?.close()
    const target = deleteTarget
    setDeleteTarget(null)
    await mutate(() => window.questLog.deleteQuest(target.id), `Deleted “${target.title}”.`)
    setSelectedId(null)
  }

  async function selectVault(): Promise<void> {
    setBusy(true)
    try {
      const next = await window.questLog.selectVault()
      setState(next)
      setWarning(
        next.pendingLogEvents.length
          ? `${next.pendingLogEvents.length} event(s) still await retry.`
          : null
      )
      setToast(next.settings.vaultPath ? 'Obsidian vault connected.' : 'Vault selection cancelled.')
    } finally {
      setBusy(false)
    }
  }

  async function retryLogs(): Promise<void> {
    await mutate(() => window.questLog.retryLogs(), 'History retry complete.')
  }

  if (!state) {
    return (
      <main className="loading-screen" aria-live="polite">
        <span className="spirit-orb" />
        Opening the archive…
      </main>
    )
  }

  const syncLabel = state.pendingLogEvents.length
    ? `${state.pendingLogEvents.length} event${state.pendingLogEvents.length === 1 ? '' : 's'} queued`
    : state.settings.vaultPath
      ? 'Archive in sync'
      : 'Vault not selected'

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-seal" aria-hidden="true">
            ✦
          </span>
          <div>
            <h1>QuestLog</h1>
            <p>Enchanted Archive</p>
          </div>
        </div>
        <p className="nav-label">Chapters</p>
        <nav>
          <NavButton
            active={view === 'active'}
            icon="⌘"
            label="Active Quests"
            subtitle="All open tasks"
            count={active.length}
            onClick={() => setView('active')}
          />
          <NavButton
            active={view === 'today'}
            icon="◇"
            label="Today's Journey"
            subtitle="Priority queue"
            count={today.length}
            onClick={() => setView('today')}
          />
          <NavButton
            active={view === 'archive'}
            icon="▣"
            label="Quest Archive"
            subtitle="Completed work"
            count={archived.length}
            onClick={() => setView('archive')}
          />
          <NavButton
            active={view === 'settings'}
            icon="⚙"
            label="Settings"
            subtitle="Storage & vault"
            onClick={() => setView('settings')}
          />
        </nav>
        <div className={`archive-status ${state.pendingLogEvents.length ? 'warning' : ''}`}>
          <span className="status-dot" aria-hidden="true" />
          <div>
            <strong>{syncLabel}</strong>
            <p>
              {state.settings.vaultPath ??
                'Choose a vault in Settings to begin the history ledger.'}
            </p>
          </div>
        </div>
      </aside>

      <section className={`main-panel ${view === 'settings' ? 'settings-view' : ''}`}>
        <header className="content-header">
          <div>
            <p className="chapter-kicker">{viewCopy[view].kicker}</p>
            <h2>{viewCopy[view].title}</h2>
            <p>{viewCopy[view].subtitle}</p>
          </div>
          {view !== 'settings' && (
            <button className="primary-button" type="button" onClick={beginCreate}>
              ＋ New Quest
            </button>
          )}
        </header>

        {warning && (
          <div className="warning-banner" role="status">
            <span>
              <strong>History ledger warning.</strong> {warning}
            </span>
            <button type="button" onClick={() => void retryLogs()} disabled={busy}>
              Retry now
            </button>
          </div>
        )}

        {view === 'settings' ? (
          <Settings state={state} busy={busy} onSelectVault={selectVault} onRetry={retryLogs} />
        ) : (
          <>
            <div className="toolbar">
              <label className="search-control">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title or description…"
                  aria-label="Search quests"
                />
              </label>
              <label className="sr-only" htmlFor="course-filter">
                Filter by course
              </label>
              <select
                id="course-filter"
                value={course}
                onChange={(event) => setCourse(event.target.value)}
              >
                <option value="all">All courses</option>
                {courses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="section-heading">
              <span>
                {displayedQuests.length
                  ? `${displayedQuests.length} ${displayedQuests.length === 1 ? 'entry' : 'entries'}`
                  : 'Quiet pages'}
              </span>
            </div>
            <div className="quest-list" aria-live="polite">
              {displayedQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  selected={quest.id === selectedId}
                  today={localDateString(new Date())}
                  busy={busy}
                  onSelect={() => chooseQuest(quest)}
                  onToggle={() =>
                    void mutate(
                      () =>
                        quest.status === 'active'
                          ? window.questLog.completeQuest(quest.id)
                          : window.questLog.reopenQuest(quest.id),
                      quest.status === 'active'
                        ? `Completed “${quest.title}”.`
                        : `Reopened “${quest.title}”.`
                    )
                  }
                  onCopy={() => void copyReference(quest)}
                  onDelete={() => requestDelete(quest)}
                />
              ))}
              {!displayedQuests.length && (
                <div className="empty-state">
                  <span aria-hidden="true">✧</span>
                  <h3>No quests on this page</h3>
                  <p>Adjust the filters or inscribe a new quest.</p>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {view !== 'settings' && (
        <aside
          className="inspector"
          aria-label={creating ? 'Create quest panel' : 'Quest details panel'}
        >
          {creating || selected ? (
            <QuestForm
              form={form}
              creating={creating}
              selected={selected}
              busy={busy}
              onChange={setForm}
              onSubmit={submitForm}
              onCancel={() => (selected ? chooseQuest(selected) : setCreating(false))}
              onCopy={selected ? () => void copyReference(selected) : undefined}
            />
          ) : (
            <div className="inspector-empty">
              <span aria-hidden="true">❧</span>
              <h3>Select a quest</h3>
              <p>Choose an entry to read or edit it, or begin a new quest.</p>
            </div>
          )}
        </aside>
      )}

      <dialog ref={deleteDialog} className="confirm-dialog" onClose={() => setDeleteTarget(null)}>
        <p className="dialog-kicker">Remove from the living archive</p>
        <h2>Delete this quest?</h2>
        <p>
          “{deleteTarget?.title}” will disappear from QuestLog. Its final snapshot remains in the
          append-only history ledger.
        </p>
        <div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => deleteDialog.current?.close()}
          >
            Keep quest
          </button>
          <button type="button" className="danger-button" onClick={() => void confirmDelete()}>
            Delete quest
          </button>
        </div>
      </dialog>

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </main>
  )
}

function NavButton(props: {
  active: boolean
  icon: string
  label: string
  subtitle: string
  count?: number
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`nav-item ${props.active ? 'active' : ''}`}
      onClick={props.onClick}
    >
      <span className="nav-icon" aria-hidden="true">
        {props.icon}
      </span>
      <span>
        <strong>{props.label}</strong>
        <small>{props.subtitle}</small>
      </span>
      {props.count !== undefined && <em>{props.count}</em>}
    </button>
  )
}

function QuestCard(props: {
  quest: Quest
  selected: boolean
  today: string
  busy: boolean
  onSelect: () => void
  onToggle: () => void
  onCopy: () => void
  onDelete: () => void
}): React.JSX.Element {
  const { quest } = props
  const dueText =
    quest.dueDate === props.today
      ? 'Due today'
      : quest.dueDate && quest.dueDate < props.today
        ? 'Overdue'
        : quest.dueDate
          ? `Due ${formatDate(quest.dueDate)}`
          : null
  return (
    <article
      className={`quest-card ${props.selected ? 'selected' : ''} ${quest.status === 'completed' ? 'completed' : ''}`}
    >
      <button
        className="complete-toggle"
        type="button"
        disabled={props.busy}
        onClick={props.onToggle}
        aria-label={
          quest.status === 'active' ? `Mark ${quest.title} complete` : `Reopen ${quest.title}`
        }
      >
        {quest.status === 'completed' ? '✓' : ''}
      </button>
      <button
        className="quest-copy"
        type="button"
        onClick={props.onSelect}
        aria-label={`View ${quest.title}`}
      >
        <span className="quest-title-row">
          <strong>{quest.title}</strong>
          {quest.important && (
            <span className="important-star" aria-label="Important">
              ★
            </span>
          )}
        </span>
        {quest.description && <span className="quest-description">{quest.description}</span>}
        <span className="quest-meta">
          {quest.course && <span className="tag">{quest.course}</span>}
          {dueText && (
            <span className={`tag due ${dueText === 'Overdue' ? 'overdue' : ''}`}>{dueText}</span>
          )}
        </span>
      </button>
      <div className="card-actions">
        <button
          type="button"
          onClick={props.onCopy}
          aria-label={`Copy reference for ${quest.title}`}
        >
          ⧉
        </button>
        <button
          type="button"
          className="delete-icon"
          onClick={props.onDelete}
          aria-label={`Delete ${quest.title}`}
        >
          ×
        </button>
      </div>
    </article>
  )
}

function QuestForm(props: {
  form: FormValues
  creating: boolean
  selected: Quest | null
  busy: boolean
  onChange: (form: FormValues) => void
  onSubmit: (event: React.FormEvent) => void
  onCancel: () => void
  onCopy?: () => void
}): React.JSX.Element {
  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]): void =>
    props.onChange({ ...props.form, [key]: value })
  return (
    <div className="inspector-inner">
      <header>
        <p>{props.creating ? 'Create quest' : 'Edit quest'}</p>
        <h2>{props.creating ? 'New archive entry' : 'Quest details'}</h2>
      </header>
      <div className="ornament">✦</div>
      <form onSubmit={(event) => void props.onSubmit(event)}>
        <label>
          Title
          <input
            autoFocus={props.creating}
            required
            maxLength={160}
            value={props.form.title}
            onChange={(event) => update('title', event.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            rows={5}
            maxLength={2000}
            value={props.form.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </label>
        <div className="field-row">
          <label>
            Course / module
            <input
              maxLength={120}
              value={props.form.course}
              onChange={(event) => update('course', event.target.value)}
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              value={props.form.dueDate ?? ''}
              onChange={(event) => update('dueDate', event.target.value || null)}
            />
          </label>
        </div>
        <label className="check-field">
          <span>
            <strong>Mark important</strong>
            <small>Surfaces in Today’s Journey</small>
          </span>
          <input
            type="checkbox"
            checked={props.form.important}
            onChange={(event) => update('important', event.target.checked)}
          />
        </label>
        <div className="reference-block">
          <span>
            <small>Stable quest reference</small>
            <code>
              {props.selected
                ? questReference(props.selected)
                : 'Generated when this quest is created'}
            </code>
          </span>
          {props.onCopy && (
            <button type="button" onClick={props.onCopy}>
              ⧉ Copy
            </button>
          )}
        </div>
        <div className="form-actions">
          <button className="save-button" disabled={props.busy || !props.form.title.trim()}>
            {props.creating ? 'Add to archive' : 'Save changes'}
          </button>
          <button className="secondary-button" type="button" onClick={props.onCancel}>
            Cancel
          </button>
        </div>
      </form>
      <p className="log-note">
        ⓘ Saving updates the local archive first, then appends an event to the selected Obsidian
        vault.
      </p>
    </div>
  )
}

function Settings(props: {
  state: AppSnapshot
  busy: boolean
  onSelectVault: () => Promise<void>
  onRetry: () => Promise<void>
}): React.JSX.Element {
  return (
    <div className="settings-grid">
      <section className="settings-card">
        <span className="settings-icon" aria-hidden="true">
          ◇
        </span>
        <div>
          <p className="card-kicker">Obsidian connection</p>
          <h3>History vault</h3>
          <p>
            QuestLog appends monthly Markdown records under{' '}
            <code>QuestLog/Task History/YYYY-MM.md</code>.
          </p>
          <div className="path-box">{props.state.settings.vaultPath ?? 'No vault selected'}</div>
          <button
            className="primary-button"
            type="button"
            disabled={props.busy}
            onClick={() => void props.onSelectVault()}
          >
            {props.state.settings.vaultPath ? 'Choose another vault' : 'Choose Obsidian vault'}
          </button>
        </div>
      </section>
      <section className="settings-card">
        <span className="settings-icon" aria-hidden="true">
          ↻
        </span>
        <div>
          <p className="card-kicker">Append-only ledger</p>
          <h3>Logging status</h3>
          <p>
            {props.state.pendingLogEvents.length
              ? `${props.state.pendingLogEvents.length} event(s) are safely queued in local storage.`
              : 'All local mutations have corresponding history records.'}
          </p>
          <button
            className="secondary-button"
            type="button"
            disabled={props.busy || !props.state.pendingLogEvents.length}
            onClick={() => void props.onRetry()}
          >
            Retry queued events
          </button>
        </div>
      </section>
      <section className="settings-card wide">
        <span className="settings-icon" aria-hidden="true">
          ▣
        </span>
        <div>
          <p className="card-kicker">Local authority</p>
          <h3>QuestLog application data</h3>
          <p>
            Tasks, vault settings, and the retry queue persist as an atomic JSON file. This file
            remains authoritative if Obsidian is unavailable.
          </p>
          <div className="path-box">{props.state.dataFilePath}</div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void window.questLog.showDataFolder()}
          >
            Show data folder
          </button>
        </div>
      </section>
    </div>
  )
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(year, month - 1, day))
}

export default App
