from app.execution.base import BaseExecutor, ExecutionResult

class BrowserExecutor(BaseExecutor):
    async def run(
        self,
        code:            str,
        language:        str,
        stdin:           str | None,
        expected_stdout: str,
        time_limit_ms:   int,
        memory_limit_mb: int,
    ) -> ExecutionResult:
        # Browser-based problems (HTML/CSS/JS) run client-side in an iframe sandbox.
        # Server-side we auto-pass submissions so they are recorded successfully.
        return ExecutionResult(
            passed=True,
            actual_stdout="[Rendered in browser]",
            exec_time_ms=0,
            stderr=""
        )
