# DevLab Backend Guide — Execution Engines

**Module:** `app/execution/`  
**Files:** `base.py`, `docker_executor.py`, `sqlite_executor.py`, `browser_executor.py`  
**Used by:** `app/services/grading_service.py`

---

## Overview

The execution layer is the sandboxed environment that runs student code against test cases. There are three engines:

| Engine | Languages | Isolation |
|--------|-----------|-----------|
| Docker executor | Python, Java, C++ | Short-lived container, resource-limited |
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

## Docker Executor (`app/execution/docker_executor.py`)

Handles Python, Java, and C++.

### How it works

1. Write the student's code to a temp file on the host
2. Start a Docker container with:
   - The temp directory mounted read-only
   - CPU and memory limits applied
   - No network access
   - A single command to compile (if needed) and run the code with `stdin` piped in
3. Capture `stdout` and `stderr`
4. Compare `stdout.strip()` to `expected_stdout.strip()`
5. Destroy the container
6. Return `ExecutionResult`

### Language-specific commands

```python
LANGUAGE_CONFIG = {
    "python": {
        "image":   "python:3.11-slim",
        "compile": None,
        "run":     "python /code/solution.py",
        "file":    "solution.py",
    },
    "java": {
        "image":   "openjdk:21-slim",
        "compile": "javac /code/Solution.java",
        "run":     "java -cp /code Solution",
        "file":    "Solution.java",
    },
    "cpp": {
        "image":   "gcc:13",
        "compile": "g++ -O2 -o /code/solution /code/solution.cpp",
        "run":     "/code/solution",
        "file":    "solution.cpp",
    },
}
```

### Implementation

```python
import docker
import tempfile
import os
import time

client = docker.from_env()

class DockerExecutor(BaseExecutor):
    async def run(self, code, language, stdin, expected_stdout, time_limit_ms, memory_limit_mb) -> ExecutionResult:
        config = LANGUAGE_CONFIG[language]
        start = time.monotonic()

        with tempfile.TemporaryDirectory() as tmpdir:
            # Write code file
            code_path = os.path.join(tmpdir, config["file"])
            with open(code_path, "w") as f:
                f.write(code)

            try:
                # Compile step (Java, C++)
                if config["compile"]:
                    compile_result = client.containers.run(
                        config["image"],
                        command=config["compile"],
                        volumes={tmpdir: {"bind": "/code", "mode": "rw"}},
                        remove=True,
                        network_disabled=True,
                        mem_limit=f"{memory_limit_mb}m",
                        stdout=True,
                        stderr=True,
                    )
                    if compile_result.exit_code != 0:
                        return ExecutionResult(
                            passed=False,
                            actual_stdout="",
                            exec_time_ms=0,
                            stderr=compile_result.decode(),
                        )

                # Run step
                timeout_secs = time_limit_ms / 1000
                result = client.containers.run(
                    config["image"],
                    command=config["run"],
                    volumes={tmpdir: {"bind": "/code", "mode": "ro"}},
                    stdin_open=True,
                    remove=True,
                    network_disabled=True,
                    mem_limit=f"{memory_limit_mb}m",
                    cpu_quota=settings.SANDBOX_CPU_QUOTA,
                    environment={"STDIN_DATA": stdin or ""},
                    stdout=True,
                    stderr=True,
                    timeout=int(timeout_secs) + 2,
                )

            except docker.errors.ContainerError as e:
                elapsed_ms = int((time.monotonic() - start) * 1000)
                return ExecutionResult(
                    passed=False,
                    actual_stdout="",
                    exec_time_ms=elapsed_ms,
                    stderr=e.stderr.decode() if e.stderr else "Runtime error",
                )

            elapsed_ms = int((time.monotonic() - start) * 1000)
            actual = result.decode().strip()
            expected = expected_stdout.strip()

            return ExecutionResult(
                passed=(actual == expected),
                actual_stdout=actual,
                exec_time_ms=elapsed_ms,
                stderr="",
            )
```

### Resource limits

Apply these from `settings`:

| Limit | Value | Notes |
|-------|-------|-------|
| Memory | `memory_limit_mb` (default 256MB) | `mem_limit` in Docker SDK |
| CPU | `SANDBOX_CPU_QUOTA` (default 50000 = 50%) | `cpu_quota` |
| Network | Disabled | `network_disabled=True` |
| Timeout | `time_limit_ms / 1000 + 2s` buffer | Outer `timeout` on `containers.run` |

### Time Limit Exceeded

If `elapsed_ms > time_limit_ms`, override `stderr` with "Time Limit Exceeded" and set `passed=False` regardless of output match.

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
from app.execution.docker_executor  import DockerExecutor
from app.execution.sqlite_executor  import SQLiteExecutor
from app.execution.browser_executor import BrowserExecutor

def get_executor(language: str) -> BaseExecutor:
    if language in ("python", "java", "cpp"):
        return DockerExecutor()
    if language == "sql":
        return SQLiteExecutor()
    if language == "html":
        return BrowserExecutor()
    raise ValueError(f"Unsupported language: {language}")
```

---

## Security Checklist for Docker Sandbox

- `network_disabled=True` — no outbound/inbound network from container
- `mem_limit` — prevents memory exhaustion
- `cpu_quota` — prevents CPU starvation of the host
- Container is always `remove=True` — no persistent container state
- Code files written to a temp directory that is cleaned up after each run
- Never mount sensitive host paths into the container
- Consider running containers as a non-root user: add `user="1000:1000"` to `containers.run`

---

## Out of Scope

- Multi-file submissions
- Custom Docker images per problem
- Streaming stdout back to the client in real-time
- Assembly language execution
- Node.js / full-stack server-side execution
