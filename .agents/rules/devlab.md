# DevLab Workspace Conventions & Rules

These guidelines serve as the source of truth for development on the DevLab platform. All subsequent implementation phases must adhere strictly to these conventions.

---

## 1. Project Architecture

### Backend (To be created from scratch)
- **Framework**: FastAPI (async).
- **Package Management**: `uv` for python dependency management.
- **Deployment & Environment**: Docker and Docker Compose.
- **Database ORM**: async SQLAlchemy 2.x using modern `Mapped`/`mapped_column` style. PostgreSQL as the primary database. Redis available for caching/session state where explicitly needed.
- **Datetimes**: All datetimes MUST be stored and returned as UTC-aware Python `datetime` objects.
- **Error Handling**:
  - Service layer functions must NEVER raise `HTTPException` directly.
  - Instead, raise custom errors (`NotFoundError`, `ForbiddenError`, `ConflictError`, etc.) from `app/utils/errors.py`.
  - Translate these to HTTP responses via global exception handlers registered at the FastAPI app level.
- **Transactions & Database Session**:
  - Perform `await db.flush()` mid-operation if you need to fetch auto-generated IDs before a transaction ends.
  - Commit exactly once at the end of the service function.
- **Authentication & Authorization**:
  - JWT-based authentication via FastAPI dependencies: `Depends(get_current_user)`, `Depends(require_lecturer)`, and `Depends(require_student)` defined in `app/dependencies.py`.
  - JWT payload shape: `{ "sub": int, "role": str, "name": str, "exp": int }`.
- **Code Organization**:
  - Routers: `app/routers/`
  - Services: `app/services/`
  - Models: `app/models/`
  - Pydantic Schemas: `app/schemas/`
- **JSON Naming Conventions**:
  - Request/response JSON uses `camelCase`.
  - Python internals use `snake_case`.
  - Pydantic models must use aliasing/populate_by_name to handle this mapping automatically (follow existing examples/schemas).

### Frontend (React v19 + JavaScript/JSX)
- **Tech Stack**: React 19, Vite, React Router DOM v7, Zustand, Axios, TailwindCSS 3, Lucide React, Framer Motion.
- **Language**: JavaScript (using `.jsx` extensions for components), not TypeScript.
- **Folder Structure**:
  - `src/api/`: API modules (e.g. `auth.api.js`, `courses.api.js`) extending from the central `axiosInstance.js`.
  - `src/store/`: Zustand state stores (e.g. `authStore.js`).
  - `src/router/`: Navigation and routing definitions (`AppRouter.jsx`).
  - `src/components/`: Reusable components (e.g., layouts in `src/components/layout/`, UI utilities).
  - `src/pages/`: Page components grouped by access levels: `shared`, `auth`, `student`, `lecturer`.
  - `src/styles/`: Custom theme configuration and variables (e.g., `tokens.css`).
- **Styling & Design System**:
  - Built-in TailwindCSS and CSS tokens in `src/styles/tokens.css`.
  - Leverages variables (e.g., `var(--bg-primary)`, `var(--bg-surface)`, `var(--accent)`, `var(--text-primary)`, `var(--border)`).
  - Use existing semantic styling classes: `glass` (card styling), `glass-sm`, `input` (inputs), `select` (dropdowns), `btn-primary` (primary buttons), and `nav-item` (navigation links).
- **Access Control**:
  - Route authorization is enforced via `<ProtectedRoute allowedRole="...">` in `src/router/AppRouter.jsx`.
  - Active user identity and authentication status is managed in `authStore.js`.
  - API calls add the JWT from `localStorage` using an request interceptor in `axiosInstance.js`.

---

## 2. General Principles
- **No mixed features**: Never combine unrelated features or scope expansions in a single commit or pull request.
- **Scope check**: Flag if a task requires touching files outside of its declared scope, and request clarification.
- **Aesthetic focus**: Ensure any new UI aligns perfectly with the dark modern grid-dots styling and custom variables, without introducing visual inconsistency.
