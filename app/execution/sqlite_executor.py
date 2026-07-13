import aiosqlite
import time
import csv
import io
from app.execution.base import BaseExecutor, ExecutionResult

def rows_to_csv(rows: list[tuple]) -> str:
    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")
    for row in rows:
        # Normalize cell values to strings
        writer.writerow([str(cell) if cell is not None else "" for cell in row])
    return output.getvalue().strip()

def compare_result_sets(actual_csv: str, expected_stdout: str) -> bool:
    def normalise_rows(csv_text: str) -> set[tuple]:
        if not csv_text or not csv_text.strip():
            return set()
        # Parse CSV strings into normalized sets of cell values
        reader = csv.reader(io.StringIO(csv_text.strip()))
        return {tuple(str(cell).strip() for cell in row) for row in reader}
    
    return normalise_rows(actual_csv) == normalise_rows(expected_stdout)

class SQLiteExecutor(BaseExecutor):
    async def run(
        self,
        code:            str,
        language:        str,
        stdin:           str | None,
        expected_stdout: str,
        time_limit_ms:   int,
        memory_limit_mb: int,
    ) -> ExecutionResult:
        seed_sql = stdin or ""
        start = time.monotonic()
        
        try:
            async with aiosqlite.connect(":memory:") as db:
                # 1. Execute seed schema + data
                if seed_sql:
                    await db.executescript(seed_sql)
                
                # 2. Execute student query
                cursor = await db.execute(code)
                rows = await cursor.fetchall()
                
            elapsed_ms = int((time.monotonic() - start) * 1000)
            actual_csv = rows_to_csv(rows)
            passed = compare_result_sets(actual_csv, expected_stdout)
            
            return ExecutionResult(
                passed=passed,
                actual_stdout=actual_csv,
                exec_time_ms=elapsed_ms,
                stderr=""
            )
            
        except Exception as e:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            return ExecutionResult(
                passed=False,
                actual_stdout="",
                exec_time_ms=elapsed_ms,
                stderr=str(e)
            )
