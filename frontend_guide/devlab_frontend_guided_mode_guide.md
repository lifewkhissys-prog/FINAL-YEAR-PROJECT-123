# DevLab Frontend Guide — Guided Mode Editor

**Stack:** React.js + TailwindCSS + Monaco Editor  
**Feature scope:** Scrollable narrative problem renderer with inline code editors, progressive unlock

---

## Overview

Guided mode is a story-driven problem format. The page renders as a vertical scroll of blocks — alternating narrative paragraphs and runnable code editors. The student reads, writes code in an inline editor, runs it, and the next section of the story unlocks when the code produces the correct output.

Inspired by SQL Murder Mystery and Codedex. The key design principle: the code is a tool for answering a question inside a narrative, not an isolated exercise.

---

## Content Format

A guided problem is stored as an ordered array of blocks. Each block is one of two types:

```ts
type NarrativeBlock = {
  type: "narrative";
  content: string; // Markdown
};

type EditorBlock = {
  type: "editor";
  id: string;
  language: "python" | "java" | "cpp" | "sql" | "html";
  starterCode: string;
  expectedOutput: string; // used server-side, not exposed to client
  hint?: string;
};

type GuidedBlock = NarrativeBlock | EditorBlock;
```

The page receives an ordered `GuidedBlock[]` from the API and renders them top to bottom.

---

## Page Layout

Route: `/student/problems/:problemId` (when `problem.type === "guided"`)

- Full-width scrollable single column, max-width ~`800px`, centered
- No split pane — the editor sits inline within the narrative flow
- A subtle progress indicator at the top (e.g. `3 / 7 sections complete`)

---

## Rendering Rules

### Narrative blocks
- Render the `content` field as Markdown (use `react-markdown` or similar)
- Support **bold**, *italic*, `inline code`, tables, and code fences for schema display
- Always visible — never locked

### Editor blocks
- Render a Monaco Editor instance with the block's `language` and `starterCode`
- Editor height: auto-grow to fit content, min `120px`, max `400px`
- Below the editor: **Run** button and **Hint** toggle (if `hint` is present)
- Show a status area below the editor for feedback

### Lock/unlock state
- All editor blocks after the first unsolved one are **locked** (greyed out, editors disabled, a lock icon overlay)
- When a block is solved, the next block unlocks with a smooth reveal animation
- Solved blocks show a green checkmark and become read-only (editor still visible but disabled)

---

## Run Flow

1. Student writes code in an editor block and clicks **Run**
2. POST to `/submissions/run` with `{ problemId, blockId, code, language }`
3. Show a loading spinner in the status area while waiting
4. On response:
   - **Pass** → mark block as solved, reveal next block with animation, show "✓ Correct" in green
   - **Fail** → show which test cases failed, actual vs expected output. Do not unlock next block.
   - **Error** → show the runtime error/stderr inline

The Run button is for checking correctness in guided mode — there is no separate "Submit" in this mode. Completing all blocks constitutes completion.

---

## State Management

Track per-problem progress in component state (and optionally persist to `localStorage` so a page refresh doesn't reset progress):

```ts
type GuidedProgress = {
  problemId: string;
  solvedBlockIds: string[];
  codeByBlockId: Record<string, string>; // preserve drafts
};
```

On page load, restore any saved code drafts into the editors.

---

## API Endpoints Used

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| GET | `/problems/:id` | — | Returns problem metadata + blocks array |
| POST | `/submissions/run` | `{ problemId, blockId, code, language }` | Returns pass/fail + test result details |

---

## UI States

| State | Behaviour |
|-------|-----------|
| Loading problem | Skeleton loader for blocks |
| Block running | Spinner, Run button disabled |
| Block passed | Green checkmark, editor read-only, next block reveals |
| Block failed | Red feedback panel with actual vs expected output |
| Runtime error | Orange panel with stderr text |
| All blocks solved | Completion banner at the bottom of the page |

---

## Hint System

If an editor block has a `hint` field:
- Show a **Show Hint** toggle link below the Run button
- Clicking it reveals the hint text in a muted panel
- Hints are always optional and never auto-shown

---

## Out of Scope

- Saving progress to the server (localStorage only for now)
- Collaborative editing
- Multiple attempts tracking per guided block (tracked server-side via Submission table)
- Lecturer preview of guided mode (authoring is a separate feature)
