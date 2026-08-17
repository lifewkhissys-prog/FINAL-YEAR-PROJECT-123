"""
Lightweight schema migrations applied at startup.

`Base.metadata.create_all` creates missing tables but never alters existing ones, so any column or
constraint added after a database was first created has to be patched in here. Everything in this
module is idempotent and safe to run on every boot.

This lives apart from `main.py` so that scripts and tests which drive the pipeline directly — without
going through the FastAPI lifespan — can apply the same migrations.
"""

from sqlalchemy import text

from app.database import Base, engine

# Columns added to tables that predate them.
ADDED_COLUMNS = [
    ("thesis_submissions", "pipeline_step", "VARCHAR(100)"),
    ("thesis_submissions", "pipeline_progress", "INTEGER"),
    ("thesis_submissions", "compliance_findings", "JSON"),
    ("thesis_submissions", "structure_option", "VARCHAR(20)"),
    ("thesis_submissions", "error_detail", "TEXT"),
    ("assessment_results", "scoring_failed", "BOOLEAN"),
    ("assessment_results", "error_detail", "TEXT"),
    ("rubric_criteria", "assessment_type", "VARCHAR(20) DEFAULT 'thesis'"),
    ("rubric_criteria", "deprecated_at", "TIMESTAMP"),
    ("rubric_sub_criteria", "chapter_target", "VARCHAR(100)"),
    ("rubric_sub_criteria", "deprecated_at", "TIMESTAMP"),
]

# Columns that must accept NULL so an unscored sub-criterion can be stored as unscored instead of
# being given a substitute mark.
RELAXED_NOT_NULL = [("assessment_results", "ai_score"), ("assessment_results", "ai_justification")]


async def apply_migrations(verbose: bool = True) -> list[str]:
    """Create any missing tables, then patch columns and constraints. Returns a list of warnings."""
    warnings: list[str] = []

    def log(message: str):
        if verbose:
            print(message)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    for table, column, col_type in ADDED_COLUMNS:
        try:
            async with engine.begin() as conn:
                dialect = conn.dialect.name
                if dialect == "postgresql":
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}"))
                else:
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                log(f"Schema: added {table}.{column}")
        except Exception:
            pass  # already present

    async with engine.begin() as conn:
        dialect = conn.dialect.name
        if dialect == "postgresql":
            for table, column in RELAXED_NOT_NULL:
                try:
                    await conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN {column} DROP NOT NULL"))
                    log(f"Schema: relaxed {table}.{column} to nullable")
                except Exception as e:
                    warnings.append(f"could not relax {table}.{column}: {e}")

            # Alter column types that were previously truncated to VARCHAR(100)
            try:
                await conn.execute(text("ALTER TABLE thesis_submissions ALTER COLUMN supervisor_recommendation TYPE TEXT"))
                await conn.execute(text("ALTER TABLE thesis_submissions ALTER COLUMN pipeline_step TYPE VARCHAR(255)"))
                log("Schema: updated thesis_submissions.supervisor_recommendation to TEXT")
            except Exception as e:
                pass


        elif dialect == "sqlite":
            # SQLite cannot drop a NOT NULL constraint in place. Report it rather than letting the
            # first unscored sub-criterion fail with an opaque IntegrityError at insert time.
            for table, column in RELAXED_NOT_NULL:
                try:
                    rows = (await conn.execute(text(f"PRAGMA table_info({table})"))).fetchall()
                    if any(r[1] == column and r[3] for r in rows):
                        warnings.append(
                            f"{table}.{column} is still NOT NULL. Unscored sub-criteria cannot be "
                            f"recorded until this is relaxed — delete the database file and let it "
                            f"be recreated, or rebuild the table."
                        )
                except Exception:
                    pass

    for w in warnings:
        log(f"Schema warning: {w}")
    return warnings
