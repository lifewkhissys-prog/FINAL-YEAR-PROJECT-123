from dataclasses import dataclass
from abc import ABC, abstractmethod

@dataclass
class ExecutionResult:
    passed:        bool
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
        pass
