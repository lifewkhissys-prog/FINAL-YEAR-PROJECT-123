from sqlalchemy import Integer, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class TestCase(Base):
    __tablename__ = "test_cases"

    id:              Mapped[int]       = mapped_column(Integer, primary_key=True)
    problem_id:      Mapped[int]       = mapped_column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    stdin:           Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_stdout: Mapped[str]       = mapped_column(Text, nullable=False)
    is_hidden:       Mapped[bool]      = mapped_column(Boolean, default=False)
    position:        Mapped[int]       = mapped_column(Integer, default=0)  # display order

    # Relationships
    problem: Mapped["Problem"] = relationship("Problem", back_populates="test_cases")
    results: Mapped[list["TestResult"]] = relationship("TestResult", back_populates="test_case", cascade="all, delete-orphan")
