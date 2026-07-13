import base64
import httpx
import logging
from app.config import settings
from app.execution.base import BaseExecutor, ExecutionResult

logger = logging.getLogger(__name__)

def safe_b64decode(val: str | None) -> str:
    if not val:
        return ""
    try:
        return base64.b64decode(val.encode("utf-8")).decode("utf-8", errors="replace")
    except Exception:
        return ""

def safe_b64encode(val: str | None) -> str:
    if not val:
        return ""
    return base64.b64encode(val.encode("utf-8")).decode("utf-8")

class Judge0Executor(BaseExecutor):
    def __init__(self):
        self.language_mapping = {}
        self.initialized = False
        
    def _get_headers(self) -> dict:
        headers = {
            "Content-Type": "application/json"
        }
        if settings.JUDGE0_API_KEY:
            url_lower = settings.JUDGE0_API_URL.lower()
            if "rapidapi.com" in url_lower:
                headers["X-RapidAPI-Key"] = settings.JUDGE0_API_KEY
                # Parse host name from URL
                host = settings.JUDGE0_API_URL.replace("https://", "").replace("http://", "").split("/")[0]
                headers["X-RapidAPI-Host"] = host
            else:
                # Custom header or standard authorization header
                headers["X-Auth-Token"] = settings.JUDGE0_API_KEY
                headers["X-Judge0-Token"] = settings.JUDGE0_API_KEY
                if settings.JUDGE0_USE_AUTH_HEADER:
                    headers["Authorization"] = f"Bearer {settings.JUDGE0_API_KEY}"
        return headers

    async def initialize(self):
        if self.initialized:
            return
            
        # Standard fallback IDs
        fallback = {
            "python": 71, # Python 3.8.1
            "java": 62,   # OpenJDK 13.0.1
            "cpp": 54     # GCC 9.2.0
        }
        
        try:
            url = f"{settings.JUDGE0_API_URL.rstrip('/')}/languages"
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=5.0)
                
            if response.status_code == 200:
                languages = response.json()
                # Find matching language IDs based on names
                # For python
                py_lang = next((l for l in languages if "python" in l.get("name", "").lower()), None)
                if py_lang:
                    fallback["python"] = py_lang["id"]
                
                # For java
                java_lang = next((l for l in languages if "java" in l.get("name", "").lower()), None)
                if java_lang:
                    fallback["java"] = java_lang["id"]
                    
                # For C++
                cpp_lang = next((l for l in languages if "c++" in l.get("name", "").lower() or "g++" in l.get("name", "").lower()), None)
                if cpp_lang:
                    fallback["cpp"] = cpp_lang["id"]
                    
                logger.info(f"Dynamically mapped Judge0 languages: {fallback}")
            else:
                logger.warning(f"Failed to query Judge0 languages (status {response.status_code}), using static fallbacks.")
        except Exception as e:
            logger.error(f"Error querying Judge0 languages: {e}, using static fallbacks.")
            
        self.language_mapping = fallback
        self.initialized = True

    async def run(
        self,
        code:            str,
        language:        str,
        stdin:           str | None,
        expected_stdout: str,
        time_limit_ms:   int,
        memory_limit_mb: int,
    ) -> ExecutionResult:
        if not self.initialized:
            await self.initialize()
            
        lang_id = self.language_mapping.get(language)
        if not lang_id:
            return ExecutionResult(
                passed=False,
                actual_stdout="",
                exec_time_ms=0,
                stderr=f"Unsupported language for Judge0: {language}"
            )
            
        # Convert limits
        # Judge0 expects cpu_time_limit in seconds (float)
        cpu_time_limit = float(time_limit_ms) / 1000.0
        # Judge0 expects memory_limit in KB (integer)
        memory_limit_kb = int(memory_limit_mb) * 1024
        
        payload = {
            "source_code": safe_b64encode(code),
            "language_id": lang_id,
            "stdin": safe_b64encode(stdin),
            "cpu_time_limit": cpu_time_limit,
            "memory_limit": memory_limit_kb
        }
        
        try:
            url = f"{settings.JUDGE0_API_URL.rstrip('/')}/submissions?wait=true"
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=(cpu_time_limit + 5.0))
                
            if response.status_code not in (200, 201):
                return ExecutionResult(
                    passed=False,
                    actual_stdout="",
                    exec_time_ms=0,
                    stderr=f"Judge0 server error: HTTP {response.status_code}\n{response.text}"
                )
                
            res_data = response.json()
            status_id = res_data.get("status", {}).get("id", 0)
            status_desc = res_data.get("status", {}).get("description", "Unknown error")
            
            # Extract metrics
            exec_time_sec = res_data.get("time")
            exec_time_ms = int(float(exec_time_sec) * 1000) if exec_time_sec is not None else 0
            
            memory_kb = res_data.get("memory")
            # Map memory from KB to MB
            memory_mb = int(memory_kb) // 1024 if memory_kb is not None else 0
            
            # Decode streams
            stdout_decoded = safe_b64decode(res_data.get("stdout")).strip()
            stderr_decoded = safe_b64decode(res_data.get("stderr"))
            compile_decoded = safe_b64decode(res_data.get("compile_output"))
            
            # Handle specific compilation / runtime errors
            if status_id == 6: # Compilation Error
                return ExecutionResult(
                    passed=False,
                    actual_stdout="",
                    exec_time_ms=exec_time_ms,
                    stderr=compile_decoded or "Compilation error"
                )
            elif status_id == 5: # Time Limit Exceeded
                return ExecutionResult(
                    passed=False,
                    actual_stdout="",
                    exec_time_ms=exec_time_ms,
                    stderr="Time Limit Exceeded"
                )
            elif status_id in (7, 8, 9, 10, 11, 12): # Runtime errors
                return ExecutionResult(
                    passed=False,
                    actual_stdout="",
                    exec_time_ms=exec_time_ms,
                    stderr=stderr_decoded or f"Runtime error: {status_desc}"
                )
            elif status_id not in (3, 4): # Other failure states
                return ExecutionResult(
                    passed=False,
                    actual_stdout="",
                    exec_time_ms=exec_time_ms,
                    stderr=f"Execution failed: {status_desc}"
                )
                
            # If we exceeded the time limit in milliseconds on our side (extra guard)
            if exec_time_ms > time_limit_ms:
                return ExecutionResult(
                    passed=False,
                    actual_stdout="",
                    exec_time_ms=exec_time_ms,
                    stderr="Time Limit Exceeded"
                )
                
            # Compare outputs
            expected = expected_stdout.strip()
            passed = (stdout_decoded == expected)
            
            return ExecutionResult(
                passed=passed,
                actual_stdout=stdout_decoded,
                exec_time_ms=exec_time_ms,
                stderr=stderr_decoded or ""
            )
            
        except Exception as e:
            logger.exception("Judge0 Executor execution failed")
            return ExecutionResult(
                passed=False,
                actual_stdout="",
                exec_time_ms=0,
                stderr=f"Sandbox execution error: {str(e)}"
            )
