# DevLab Frontend Guide — Challenge Mode Editor

**Stack:** React.js + TailwindCSS + Monaco Editor  
**Feature scope:** Split-pane code editor, test case runner, timed assessment UI, submission

---

## Overview

Challenge mode is the LeetCode-style problem view. The screen is split: problem description and sample test cases on the left, a full Monaco editor on the right. Students run their code against visible sample cases freely during practice, then submit for final grading against all test cases (including hidden ones).

During a timed assessment, a countdown timer is active and submission locks when it expires.

---

## Page Layout

Route: `/student/problems/:problemId` (when `problem.type === "challenge"`)

Two-pane layout, side by side, full viewport height:

```
┌─────────────────────┬─────────────────────────────┐
│   Left pane         │   Right pane                │
│   (40% width)       │   (60% width)               │
│                     │                             │
│   Problem title     │   Language selector         │
│   Description       │   Monaco Editor             │
│   Constraints       │                             │
│   Sample test cases │   [ Run ]  [ Submit ]       │
│                     │   Output panel              │
└─────────────────────┴─────────────────────────────┘
```

- Both panes scroll independently
- A draggable resize handle between the panes is a nice-to-have
- On mobile (responsive): stack vertically, editor below description

---

## Left Pane — Problem Description

Contents:
- Problem title and language badge
- Description (render as Markdown)
- Constraints section (e.g. time limit, memory limit)
- Sample test cases — show `Input` and `Expected Output` for each visible test case
- Assessment timer (if in a timed session — see Timer section below)

Sample test cases are provided by the API as part of the problem. They are always visible. Hidden test cases used for final grading are never sent to the client.

---

## Right Pane — Editor

### Language selector
- Dropdown at the top of the pane
- Options limited to the languages defined for that problem
- Changing language resets the editor to the starter code for that language (with a confirm dialog if the editor has been modified)

### Monaco Editor
- Occupies the majority of the right pane
- Language set to match the selected language
- Starter code pre-populated from the problem's `starterCode` field
- Line numbers, syntax highlighting, basic IntelliSense enabled
- No AI autocomplete

### Action buttons
Two buttons below the editor:

**Run** — tests against visible sample cases only. Fast, no submission recorded.  
**Submit** — tests against all test cases including hidden ones. Records a Submission row.

Both buttons are disabled while a request is in flight.

During a timed assessment where the window has expired, both buttons are disabled with a "Time's up" label.

### Output panel
Below the buttons. Replaces itself on each Run/Submit. Shows:
- A tab per test case: `Case 1`, `Case 2`, etc.
- Each tab shows: pass/fail badge, actual output, expected output, execution time
- On Submit: a summary score e.g. `4 / 5 test cases passed`
- On runtime error: stderr panel with the error text

---

## Timer (Assessment Mode)

When the student accesses a problem within an active assessment window:
- A countdown timer is shown in the left pane header
- Format: `MM:SS` or `HH:MM:SS`
- Turns red in the last 5 minutes
- When it reaches `00:00`:
  - Both Run and Submit buttons are disabled
  - A banner appears: "Time's up. Your last submission has been recorded."
  - The editor becomes read-only

The timer is derived from `assessment.ends_at` (ISO timestamp from the API). Calculate remaining time as `ends_at - Date.now()` and tick down with `setInterval`.

If the student opens the problem outside an active assessment window (practice mode), no timer is shown and submission is still allowed for practice — but it is not counted as a graded submission.

---

## Practice vs Assessment Mode

The API response for a problem includes context about whether there is an active assessment:

```ts
type ProblemContext = {
  isAssessment: boolean;
  assessmentEndsAt?: string; // ISO timestamp, present if isAssessment === true
};
```

| Mode | Timer | Submit records grade | Run available |
|------|-------|---------------------|---------------|
| Practice | No | No | Yes |
| Assessment (active) | Yes | Yes | Yes |
| Assessment (expired) | Expired state | No | No |

---

## State Management

```ts
type ChallengeState = {
  problemId: string;
  selectedLanguage: string;
  code: string; // current editor content
  lastRunResult: RunResult | null;
  lastSubmitResult: SubmitResult | null;
  isRunning: boolean;
  isSubmitting: boolean;
};
```

Persist `code` to `localStorage` keyed by `problemId + language` so drafts survive a page refresh.

---

## API Endpoints Used

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| GET | `/problems/:id` | — | Returns problem, sample test cases, context |
| POST | `/submissions/run` | `{ problemId, code, language }` | Run against sample cases only |
| POST | `/submissions/submit` | `{ problemId, code, language }` | Full graded submission |

---

## UI States

| State | Behaviour |
|-------|-----------|
| Loading | Skeleton for both panes |
| Idle | Editor active, Run + Submit enabled |
| Running | Spinner in output panel, buttons disabled |
| Submitting | Spinner in output panel, buttons disabled |
| Run result | Output panel shows per-case tabs |
| Submit result | Output panel shows score summary + per-case tabs |
| Runtime error | Orange error panel with stderr |
| Time expired | Buttons disabled, editor read-only, banner shown |

---

## Out of Scope

- Real-time collaboration
- Multiple language tabs open simultaneously
- Code diff between submissions
- Keyboard shortcut to run (nice-to-have, not required)
