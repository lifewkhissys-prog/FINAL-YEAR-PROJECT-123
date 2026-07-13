from sqlalchemy import Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class TestResult(Base):
    __tablename__ = "test_results"

    id:             Mapped[int]      = mapped_column(Integer, primary_key=True)
    submission_id:  Mapped[int]      = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    test_case_id:   Mapped[int]      = mapped_column(ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    passed:         Mapped[bool]     = mapped_column(Boolean, nullable=False)
    actual_stdout:  Mapped[str]      = mapped_column(Text, nullable=False)
    exec_time_ms:   Mapped[int]      = mapped_column(Integer, nullable=False)
    stderr:         Mapped[str|None] = mapped_column(Text, nullable=True)

    # Relationships
    submission: Mapped["Submission"] = relationship("Submission", back_populates="results")
    test_case:  Mapped["TestCase"]   = relationship("TestCase", back_populates="results")
