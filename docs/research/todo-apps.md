# Competitor research: offline desktop to-do apps for students

**Research date:** 2026-09-25  
**Scope:** desktop task managers relevant to a two-day student project. Primary sources were prioritized. “Offline-first” is used narrowly: the app’s authoritative working data is local, core use does not require an account/network, and cloud sync is optional rather than foundational.

## Executive conclusion

The strongest small-project pattern is **Microsoft To Do’s simple daily-focus UX plus Super Productivity’s local ownership**, without copying either product’s large integration surface. Todoist and Microsoft To Do both work during a temporary disconnection, but their own documentation shows that cloud accounts/sync remain foundational; TickTick’s current first-party pages emphasize cross-platform sync and AWS-hosted data but do not make a clear offline-first promise. Super Productivity is the clearest genuinely local-first competitor: no account is required, desktop data is stored locally, and sync is optional.[S2][S5][S8][S14][S15]

For this build, ship dependable task CRUD, completion/reopening, restart persistence, and append-only Obsidian Markdown event logs. Add only one or two student-specific touches—course/module and a “Today / Focus” view—rather than calendars, collaboration, habits, AI, or cloud sync.

## Comparison

| Application | Essential task features | Useful ideas for students | Unnecessary / over-scoped for two days | Offline and local persistence evidence | Assessment |
|---|---|---|---|---|---|
| **Todoist** | Projects/lists, task capture, reminders, list/board layouts; paid tiers add calendar layout, duration, deadlines and extensive filters.[S1] Official offline guidance says users can add, delete, complete, and change tasks while disconnected.[S2] | Fast capture; Today/Upcoming mental model; priorities, labels and a compact list UI. | Collaboration, team workspaces/roles, hundreds of projects and filters, integrations, reporting, calendar layout, AI assistance, subscription logic.[S1] | Offline edits sync when connectivity returns, but the user must already be logged in. Todoist warns that closing the app, shutting down, logging out, or clearing local data before sync can delete offline changes.[S2] Its privacy/security material describes cloud infrastructure and server-side storage.[S3] | **Offline-capable, not offline-first.** Good interaction reference; poor model for local data ownership. |
| **Microsoft To Do** | Lists, tasks, completion, due dates, reminders, importance, notes and steps/subtasks; “My Day” provides a daily focus list.[S4][S6] Microsoft explicitly markets school uses such as homework, project milestones and due-date reminders.[S7] | My Day; simple detail panel; steps for coursework; strong student framing; low-friction prioritization. | Outlook/Exchange integration, shared lists, organizational licensing, multi-device service architecture and smart suggestions.[S4][S5] | Microsoft says tasks are stored on Exchange Online servers and sync through the Microsoft Tasks API.[S4][S5] An official support notice confirms an offline mode exists, but warns unsynced data is lost if the user logs out.[S8] Work/school accounts without Exchange Online mailboxes cannot use To Do.[S5] | **Cloud-first with offline mode, not offline-first.** Best simplicity benchmark. |
| **TickTick** | Lists, tags, filters, reminders, recurrence, multiple views, notes/Markdown, priorities, subtasks and keyboard shortcuts.[S9] Free tier currently includes 9 lists, 99 tasks per list, reminders, NLP and cross-platform sync; Premium adds calendar views, duration, activities and more.[S11] | Built-in Pomodoro/focus timer, Eisenhower matrix, quick-add shortcut, task duration and focus statistics can support studying.[S9] | Habits, countdowns, location/email/constant reminders, timeline/Gantt-like view, collaboration, themes/backgrounds, AI, extensive calendar and statistics.[S9][S11] | First-party pricing emphasizes cross-platform sync.[S11] Security documentation says all user data is backed up on AWS servers; the privacy policy describes account, device, activity, location and optional AI-interaction collection.[S12][S13] **No current official source found in this review clearly guarantees fully offline desktop operation or local-authoritative storage.** | **Offline-first status unproven; evidence points to a cloud-backed service.** Use as a feature-boundary warning: it is easy to overbuild. |
| **Super Productivity** | Tasks, subtasks, projects, tags, completion/reopening, reminders, notes, scheduling, timeboxing and time tracking.[S14] | Focus/Pomodoro, break reminders, estimates versus tracked time, local notes and optional calendar import.[S14] | Jira/GitHub/Trello/DevOps integrations, timesheets, plugins, REST API, multi-provider encrypted sync, collaboration and complex conflict recovery.[S14][S16] | Official repository documentation says no account/registration is required, no data is collected, and users choose where data is stored.[S14] Desktop data, settings, automatic backups, IndexedDB and localStorage live in the OS-specific Electron user-data folder; exports/backups are local JSON.[S15] Sync is optional through SuperSync, Dropbox or WebDAV.[S14] | **Strongest offline/local-first benchmark**, but far broader than this assignment requires. |

## Established facts vs. inferences

### Established facts from primary sources

- Todoist supports disconnected task changes, but requires prior login and warns that unsynced changes can be deleted by closing/shutting down/logging out before synchronization completes.[S2]
- Microsoft To Do stores tasks in Exchange Online and automatically syncs through Microsoft’s Tasks API; Microsoft also documents an offline mode.[S4][S5][S8]
- TickTick’s current official offering is account/cloud oriented: cross-platform sync is a free feature, user data is backed up on AWS, and its privacy policy describes collected account/device/activity data.[S11][S12][S13]
- Super Productivity requires no account, keeps Electron desktop data in a local application-data directory, creates automatic local backups, and makes synchronization optional.[S14][S15]
- All four products extend far beyond simple CRUD with combinations of reminders, scheduling, focus tools, collaboration, integrations, reporting or AI.[S1][S4][S9][S14]

### Inferences and design judgments

- **Inference:** Todoist and Microsoft To Do are best described as *offline-capable cloud apps*, because offline edits are temporary local state expected to synchronize to a cloud account rather than an independently owned local data store.
- **Inference:** TickTick should not be claimed as offline-first without stronger official evidence. Absence of a clear offline guarantee is not proof that it cannot work offline; it means offline reliability should not be assumed.
- **Inference:** Super Productivity’s local storage/account-free architecture is the closest architectural competitor to the assignment, while its integration and time-tracking scope is unsuitable for a two-day implementation.
- **Design judgment:** A student product gains more from a clear course + focus workflow and trustworthy logs than from copying generic productivity breadth.

## Feature scope for our two-day build

### Essential — must ship

1. **Create, view, edit and delete tasks.**
2. **Complete and reopen tasks** without losing their identity or history.
3. **Local persistence across full app restart**, with no network or account dependency.
4. **Append-only Obsidian Markdown event log** for `created`, `edited`, `completed`, `reopened`, and `deleted` actions.
5. Task fields kept deliberately small: stable ID, title, optional details, course/module, due date, status, `createdAt`, and `updatedAt`.
6. Basic views: open tasks, completed tasks, and a simple Today/Focus filter.
7. Clear empty/error states and confirmation for destructive deletion.

### Useful if the core is verified early

- Priority or “important” flag.
- Lightweight subtasks/checklist.
- Keyboard-first quick add.
- Due-soon/overdue grouping.
- One-task focus mode or a basic Pomodoro timer **without** statistics/history dashboards.
- Search/filter by course and status.

### Explicitly defer

- Accounts, cloud sync, collaboration and conflict resolution.
- Recurring-task rule engines and notification scheduling.
- Calendar integrations or calendar drag-and-drop.
- Habits, goals, streaks, gamification and analytics.
- Attachments, rich-text editors and Markdown rendering inside tasks.
- AI/NLP capture, email ingestion and third-party integrations.
- Kanban/timeline/Gantt views, themes marketplace, plugins or public APIs.

## Custom opportunities

1. **Obsidian-native audit trail:** append one human-readable Markdown entry per mutation, including timestamp, event, task ID, title/course, and changed fields. Never rewrite or delete historical entries when a task is edited or deleted.
2. **Course-aware focus:** group or filter by module (for example, “3IXD”), then let the student select a short “focus queue” for the current study session.
3. **Assignment context without project-management weight:** optional fields for course, deliverable type, and due date are enough; avoid a separate hierarchy of workspaces/projects/teams.
4. **Transparent local storage:** show the local data/log location and provide an “Open logs folder” action. This makes offline ownership visible rather than merely technical.
5. **Event-log recovery aid:** because logs are append-only, they can help diagnose or manually reconstruct task history even if the main local store becomes corrupted. Treat this as a secondary audit record, not a replacement database.

## Concrete implications for implementation

- Make the **local store authoritative**. App launch should hydrate from disk; each successful mutation should persist before the UI reports success.
- Give every task a stable UUID. A deletion log must retain the ID and a useful snapshot so history remains understandable after the live record is removed.
- Log events only after the main state write succeeds, and serialize writes to avoid interleaved/corrupt Markdown. If logging fails, surface it rather than silently claiming full success.
- Use ISO-8601 timestamps and an append-only daily or monthly Markdown file compatible with Obsidian. Example entry shape:

```md
- 2026-09-25T14:30:00.000Z — **completed** `task-id` — Finish competitor research (3IXD)
```

- Test restart persistence and all five event types as acceptance criteria, including complete → reopen → edit → delete sequences.
- Do not spend project time proving cloud behavior. The competitor evidence shows that sync, collaboration and integrations quickly create most of the complexity and failure modes absent from the assignment.

## Sources

All sources accessed **2026-09-25**.

- **[S1] Todoist — Pricing.** Current plan limits and feature comparison. <https://www.todoist.com/pricing/>
- **[S2] Todoist Help — “Use Todoist while offline.”** Updated 2026-09-04. Offline operations, prior-login requirement, synchronization and unsynced-change warning. <https://www.todoist.com/help/articles/use-todoist-while-offline-4rbaZw>
- **[S3] Todoist — Privacy Policy.** Effective 2026-08-27. Cloud providers, information processing and storage. <https://www.todoist.com/privacy>
- **[S4] Microsoft Support — “Welcome to Microsoft To Do.”** Lists, My Day, dates, reminders, steps, notes and Exchange Online storage. <https://support.microsoft.com/en-us/todo/welcome-to-microsoft-to-do>
- **[S5] Microsoft Support — “Set up Microsoft To Do.”** Tasks API sync, Exchange storage and cloud-mailbox requirements. <https://support.microsoft.com/en-us/todo/set-up-microsoft-to-do>
- **[S6] Microsoft Support — “Add steps, importance, notes, tags, and categories to your tasks.”** Task-detail capabilities. <https://support.microsoft.com/en-us/todo/add-steps-importance-notes-tags-and-categories-to-your-tasks>
- **[S7] Microsoft Education — “Track the moving parts with Microsoft To Do.”** Student and homework use cases. <https://support.microsoft.com/en-us/education/student-help-center/track-the-moving-parts-with-microsoft-to-do>
- **[S8] Microsoft Support — “Important updates are available for Microsoft To Do apps.”** Desktop offline-mode confirmation and unsynced-data warning. <https://support.microsoft.com/en-us/todo/important-updates-are-available-for-microsoft-to-do-apps>
- **[S9] TickTick — Features.** Task organization, reminders, views, Pomodoro, habits, matrix, collaboration and other tools. <https://ticktick.com/features>
- **[S10] TickTick — Windows desktop app.** Desktop capture, calendar, collaboration, Pomodoro and widget. <https://ticktick.com/windows>
- **[S11] TickTick — Upgrade.** Current free/Premium pricing, limits, cross-platform sync and feature comparison. <https://www.ticktick.com/upgrade>
- **[S12] TickTick — Security.** AWS-hosted databases and server backups. <https://ticktick.com/security>
- **[S13] TickTick — Privacy Policy.** Revised 2026-07-09. Account/device/activity/location/AI data practices and retention. <https://beta.ticktick.com/privacy>
- **[S14] Super Productivity — official repository README.** Features, account-free use, privacy, storage choice and optional sync. <https://github.com/super-productivity/super-productivity/blob/master/README.md>
- **[S15] Super Productivity — “User Data.”** Electron local data directories, IndexedDB/localStorage and JSON backups. <https://github.com/super-productivity/super-productivity/blob/master/docs/wiki/3.06-User-Data.md>
- **[S16] Super Productivity — Releases.** Current maintained desktop releases and evidence of completion/reopening and sync complexity. <https://github.com/super-productivity/super-productivity/releases>
