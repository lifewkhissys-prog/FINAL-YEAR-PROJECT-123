# DevLab Backend Guide — Execution Engines

**Module:** `app/execution/`  
**Files:** `base.py`, `docker_executor.py`, `sqlite_executor.py`, `browser_executor.py`  
**Used by:** `app/services/grading_service.py`

---

## Overview

The execution layer is the sandboxed environment that runs student code against test cases. There are three engines:

| Engine | Languages | Isolation |
|--------|-----------|-----------|
| Judge0 executor | Python, Java, C++ | Isolated sandbox via Judge0 API |
| SQLite executor | SQL | Fresh in-memory SQLite instance per run |
| Browser executor | HTML/CSS/JS | No server execution — marks as pass, returns code |

All three implement the same interface defined in `base.py`.

---

## Base Interface (`app/execution/base.py`)

```python
from dataclasses import dataclass
from abc import ABC, abstractmethod

@dataclass
class ExecutionResult:
    passed:       bool
    actual_stdout: str
    exec_time_ms:  int
    stderr:        str = ""

class BaseExecutor(ABC):
    @abstractmethod
    async def run(
        self,
        code:            str,
        language:        str,
        stdin:           str | None,
        expected_stdout: str,
        time_limit_ms:   int,
        memory_limit_mb: int,
    ) -> ExecutionResult:
        ...
```

---

## Judge0 Executor (`app/execution/judge0_executor.py`)

Handles Python, Java, and C++.

### How it works

1. Initialize by fetching supported languages from the configured Judge0 instance to map language names to their respective `language_id` dynamically.
2. Base64-encode the student's source code and input (`stdin`) to safely handle binary, multiline, or special character payloads.
3. Submit a synchronous run request to Judge0 by POSTing to `{JUDGE0_API_URL}/submissions?wait=true` with the time and memory limits properly scaled.
4. Scale request constraints appropriately:
   - Convert time limit from milliseconds (e.g. `2000`) to seconds (`2.0` float) for Judge0's `cpu_time_limit`.
   - Convert memory limit from Megabytes (e.g. `256`) to Kilobytes (`262144` integer) for Judge0's `memory_limit`.
5. Receive execution outcomes including execution timing, memory footprint, status IDs, and base64-encoded `stdout`/`stderr`/`compile_output`.
6. Strip and compare the decoded stdout against the expected stdout, mapping outcomes to execution status types (Compilation Error, Time Limit Exceeded, Runtime Error, etc.).

### Dynamic Language Mapping

Rather than hardcoding language IDs, the Judge0 Executor queries the configured Judge0 endpoint upon initialization:

```python
# app/execution/judge0_executor.py (excerpt)
async def initialize(self):
    fallback = {
        "python": 71, # Python 3.8.1
        "java": 62,   # OpenJDK 13.0.1
        "cpp": 54     # GCC 9.2.0
    }
    try:
        url = f"{settings.JUDGE0_API_URL.rstrip('/')}/languages"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self._get_headers(), timeout=5.0)
            if response.status_code == 200:
                languages = response.json()
                # Find matching language IDs based on names
                # For python, java, cpp
                ...
```

### Status Mapping

Judge0 utilizes a standard status ID schema:

| Status ID | Description | Mapping Outcome |
|-----------|-------------|-----------------|
| 3 | Accepted | Output match verification |
| 4 | Wrong Answer | `passed=False` |
| 5 | Time Limit Exceeded | `passed=False`, `stderr="Time Limit Exceeded"` |
| 6 | Compilation Error | `passed=False`, `stderr=compile_output` |
| 7 to 12 | Runtime Errors / System Failures | `passed=False`, `stderr=stderr` |

### Implementation

```python
import base64
import httpx
import logging
from app.config import settings
from app.execution.base import BaseExecutor, ExecutionResult

class Judge0Executor(BaseExecutor):
    # Implements BaseExecutor.run(...)
    # Connects to settings.JUDGE0_API_URL and submits requests with wait=true.
```

---

## SQLite Executor (`app/execution/sqlite_executor.py`)

Handles SQL problems. No Docker involved — runs in-process using `aiosqlite`.

### How it works

1. Parse the problem's `content.seedSql` to get the schema + seed data
2. Open a fresh in-memory SQLite database
3. Execute the seed SQL to set up tables and data
4. Execute the student's SQL query
5. Fetch all rows from the result set
6. Compare against `expected_stdout` (which is the expected result set serialised as CSV or JSON lines)
7. Return `ExecutionResult`

### Result set comparison

Compare as **unordered sets** unless the problem's query is expected to include `ORDER BY`:

```python
def normalise_result(rows: list[tuple]) -> set[tuple]:
    return {tuple(str(cell) for cell in row) for row in rows}

actual_set   = normalise_result(actual_rows)
expected_set = normalise_result(parse_expected(expected_stdout))
passed = (actual_set == expected_set)
```

`parse_expected` reads the expected result from the test case's `expected_stdout`, which is stored as newline-separated CSV rows.

### Implementation

```python
import aiosqlite
import time

class SQLiteExecutor(BaseExecutor):
    async def run(self, code, language, stdin, expected_stdout, time_limit_ms, memory_limit_mb) -> ExecutionResult:
        # `stdin` carries the seed SQL for SQL problems
        seed_sql = stdin or ""
        start = time.monotonic()

        try:
            async with aiosqlite.connect(":memory:") as db:
                if seed_sql:
                    await db.executescript(seed_sql)

                cursor = await db.execute(code)
                rows = await cursor.fetchall()

            elapsed_ms = int((time.monotonic() - start) * 1000)
            actual_csv = rows_to_csv(rows)
            passed = compare_result_sets(actual_csv, expected_stdout)

            return ExecutionResult(
                passed=passed,
                actual_stdout=actual_csv,
                exec_time_ms=elapsed_ms,
            )

        except Exception as e:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            return ExecutionResult(
                passed=False,
                actual_stdout="",
                exec_time_ms=elapsed_ms,
                stderr=str(e),
            )
```

**Note on SQL test cases:** For SQL problems, `TestCase.stdin` holds the seed SQL (schema + INSERT statements) and `TestCase.expected_stdout` holds the expected result set as CSV rows.

---

## Browser Executor (`app/execution/browser_executor.py`)

Handles HTML/CSS/JS problems. There is no server-side execution for these — the code runs in the student's browser (iframe sandbox on the frontend).

The backend's role here is minimal:

```python
class BrowserExecutor(BaseExecutor):
    async def run(self, code, language, stdin, expected_stdout, time_limit_ms, memory_limit_mb) -> ExecutionResult:
        # HTML/CSS/JS is not executed server-side.
        # The frontend renders it. The backend marks the submission as completed
        # with a placeholder pass — actual visual grading is manual or future scope.
        return ExecutionResult(
            passed=True,
            actual_stdout="[Rendered in browser]",
            exec_time_ms=0,
        )
```

For the FYP scope, HTML/CSS/JS submissions are treated as auto-passing on the server. The student and lecturer see the rendered output on the frontend.

---

## Executor Factory (`app/execution/__init__.py`)

```python
from app.execution.base import BaseExecutor
from app.execution.sqlite_executor import SQLiteExecutor
from app.execution.browser_executor import BrowserExecutor
from app.execution.judge0_executor import Judge0Executor

_judge0_executor = Judge0Executor()

def get_executor(language: str) -> BaseExecutor:
    lang_lower = language.lower()
    if lang_lower in ("python", "java", "cpp"):
        return _judge0_executor
    elif lang_lower == "sql":
        return SQLiteExecutor()
    elif lang_lower == "html":
        return BrowserExecutor()
    else:
        raise ValueError(f"Unsupported language: {language}")
```

---

## Security Notes for Judge0 Sandbox

- **Remote Sandbox Isolation:** Sandboxing is managed remotely or in a dedicated container group by Judge0, meaning the backend does not run untrusted student code on its own container host.
- **Resource Constraints:** CPU and memory limits are passed with every submission request (`cpu_time_limit` and `memory_limit`) and enforced by the Judge0 sandbox runner.
- **Payload Validation:** The backend validates request payload sizes before submitting to Judge0 to avoid payload injection attacks or exhausting network bandwidth.

---

## Out of Scope

- Multi-file submissions
- Custom Docker images per problem
- Streaming stdout back to the client in real-time
- Assembly language execution
- Node.js / full-stack server-side execution
