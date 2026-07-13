from app.execution.base import BaseExecutor
from app.execution.sqlite_executor import SQLiteExecutor
from app.execution.browser_executor import BrowserExecutor
from app.execution.judge0_executor import Judge0Executor

# Reuse single Judge0Executor to cache language mappings
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
