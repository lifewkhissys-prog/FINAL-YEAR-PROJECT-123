from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

class AppError(Exception):
    """Base application exception"""
    def __init__(self, message: str = "An error occurred"):
        self.message = message
        super().__init__(self.message)

class NotFoundError(AppError):
    """Resource not found (404)"""
    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found")

class ForbiddenError(AppError):
    """Action forbidden for the user (403)"""
    def __init__(self, message: str = "Forbidden: you do not have permission to access this resource"):
        super().__init__(message)

class ConflictError(AppError):
    """Conflict with existing state (409)"""
    def __init__(self, message: str = "Conflict"):
        super().__init__(message)

class BadRequestError(AppError):
    """Bad request parameter or business validation failure (400)"""
    def __init__(self, message: str = "Bad request"):
        super().__init__(message)

def register_error_handlers(app: FastAPI):
    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError):
        return JSONResponse(
            status_code=404,
            content={"detail": exc.message}
        )

    @app.exception_handler(ForbiddenError)
    async def forbidden_handler(request: Request, exc: ForbiddenError):
        return JSONResponse(
            status_code=403,
            content={"detail": exc.message}
        )

    @app.exception_handler(ConflictError)
    async def conflict_handler(request: Request, exc: ConflictError):
        return JSONResponse(
            status_code=409,
            content={"detail": exc.message}
        )

    @app.exception_handler(BadRequestError)
    async def bad_request_handler(request: Request, exc: BadRequestError):
        return JSONResponse(
            status_code=400,
            content={"detail": exc.message}
        )

    @app.exception_handler(StarletteHTTPException)
    async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
        # Translate to standard camelCase/simple schema if needed
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
        
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            loc = " -> ".join(str(l) for l in error.get("loc", []))
            msg = error.get("msg", "Validation error")
            errors.append(f"{loc}: {msg}")
        return JSONResponse(
            status_code=422,
            content={"detail": "; ".join(errors), "errors": exc.errors()}
        )
