# DevLab Frontend Guide — Submission Feedback

**Stack:** React.js + TailwindCSS  
**Feature scope:** Instant feedback display after run/submit, test result breakdown, error rendering  
**Roles involved:** Student (primary), Lecturer (view-only in gradebook)

---

## Overview

After a student runs or submits code, the frontend receives a structured result and renders it immediately below the editor. This is the same feedback component used in both guided mode and challenge mode, with minor differences depending on context.

The guiding principle: feedback should tell the student exactly what happened — which cases passed, what the actual output was, what was expected, and how long it took — without requiring them to leave the page.

---

## Result Data Shape

The API returns a `SubmissionResult` on both `/submissions/run` and `/submissions/submit`:

```ts
type TestCaseResult = {
  testCaseId: string;
  passed: boolean;
  stdin: string;
  expectedStdout: string;
  actualStdout: string;
  execTimeMs: number;
  isHidden: boolean; // always false for /run; may be true for /submit
};

type SubmissionResult = {
  submissionId: string;
  status: "completed" | "error";
  score: number;        // e.g. 4
  totalCases: number;   // e.g. 5
  results: TestCaseResult[];
  stderr?: string;      // present on runtime errors
  compileError?: string; // present on compile-time failures
};
```

Hidden test cases (`isHidden: true`) are included in the count and score but their `stdin` and `expectedStdout` are not shown — only whether they passed.

---

## Feedback Panel Layout

The feedback panel appears below the Run / Submit button and replaces itself on each new run/submit.

### Header row
- Score summary: `4 / 5 test cases passed`
- Status badge: `Accepted` (all passed, green) | `Wrong Answer` (some failed, red) | `Error` (runtime/compile error, orange)
- Execution info: `Fastest: 42ms`

### Tab bar
One tab per test case: `Case 1`, `Case 2`, etc.
- Passed cases: green tab indicator
- Failed cases: red tab indicator
- Hidden cases: grey tab with a lock icon, labelled `Hidden 1`, `Hidden 2`, etc.

### Tab content (visible test cases)

```
Input
──────────────────────────
[stdin value, or "None" if empty]

Expected Output
──────────────────────────
[expected_stdout]

Your Output
──────────────────────────
[actual_stdout]     ✓ Match  /  ✗ Mismatch

Execution time: 42ms
```

For passed cases, the Your Output section shows a green checkmark. For failed cases, show a red diff or at minimum the mismatch label.

### Tab content (hidden test cases)

```
This is a hidden test case.
Result: ✓ Passed  /  ✗ Failed

Input and expected output are not shown.
```

---

## Error States

### Runtime error (`status === "error"`, `stderr` present)

Replace the normal tab layout with:

```
Runtime Error
──────────────────────────
[stderr content, monospace, scrollable]
```

Show the error in an orange-bordered panel. The score is `0 / N`.

### Compile error (`compileError` present)

```
Compilation Failed
──────────────────────────
[compileError content, monospace, scrollable]
```

Similar styling to runtime error but labelled differently. No test case tabs.

### Time limit exceeded

If `execTimeMs` exceeds the problem's `timeLimitMs`, show a specific label:

```
Time Limit Exceeded
This test case took longer than the allowed time limit.
```

### Memory limit exceeded

Similar label if the backend signals it (typically in the `stderr` for Docker sandboxed runs).

---

## Run vs Submit Differences

| Context | Endpoint | Hidden cases in result | Score saved |
|---------|----------|------------------------|-------------|
| Run | `/submissions/run` | No | No |
| Submit | `/submissions/submit` | Yes (pass/fail only) | Yes |

The same `<FeedbackPanel>` component handles both — the only difference is which cases have `isHidden: true` in the results array.

---

## Guided Mode Feedback

In guided mode, feedback is rendered inline below each editor block rather than in a separate panel. The layout is simpler:

- Pass → green checkmark banner: "✓ Correct! Continue reading."
- Fail → compact result showing actual vs expected for the single check
- Error → orange error text

No tabs are needed in guided mode because each editor block has a single expected output check (not multiple test cases).

---

## Submission History

Students can view past submissions for a problem from the problem page.

A **Submissions** tab or collapsible section shows:

| Submitted | Language | Score | Status |
|-----------|----------|-------|--------|
| 2 hours ago | Python | 4/5 | Wrong Answer |
| 1 day ago | Python | 2/5 | Wrong Answer |

Clicking a row expands the full `FeedbackPanel` for that submission (fetched from `/submissions/:id`).

---

## API Endpoints Used

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| POST | `/submissions/run` | `{ problemId, code, language, blockId? }` | Returns result, not saved |
| POST | `/submissions/submit` | `{ problemId, code, language }` | Saved, graded |
| GET | `/submissions/:id` | — | Retrieve past result |
| GET | `/problems/:id/submissions` | — | Student's history for a problem |

---

## Out of Scope

- Side-by-side diff view between expected and actual output
- Animated test case reveal
- Submission comparison between two attempts
