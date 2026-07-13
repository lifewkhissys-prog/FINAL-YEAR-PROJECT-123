from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user, require_lecturer, require_student
from app.models.user import User
from app.schemas.problem import ProblemCreate, ProblemUpdate, ProblemResponse, PracticeProblemResponse
from app.schemas.test_case import TestCaseIn, TestCaseResponse
from app.services import problem_service

router = APIRouter()

@router.get("/practice", response_model=list[PracticeProblemResponse])
async def list_practice_problems(
    courseId: int,
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    return await problem_service.get_practice_problems(db, courseId, current_user.id)

@router.post("", response_model=ProblemResponse, status_code=201)
async def create_problem(
    body: ProblemCreate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    p = await problem_service.create_problem(db, current_user.id, body)
    return await problem_service.get_problem_detail(db, p.id, current_user)

@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await problem_service.get_problem_detail(db, problem_id, current_user)

@router.put("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: int,
    body: ProblemUpdate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    p = await problem_service.update_problem(db, problem_id, current_user.id, body)
    return await problem_service.get_problem_detail(db, p.id, current_user)

@router.delete("/{problem_id}", status_code=204)
async def delete_problem(
    problem_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    await problem_service.delete_problem(db, problem_id, current_user.id)
    return None

# Test Cases
@router.put("/{problem_id}/test-cases", response_model=list[TestCaseResponse])
async def replace_test_cases(
    problem_id: int,
    body: list[TestCaseIn],
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await problem_service.replace_test_cases(db, problem_id, current_user.id, body)

@router.get("/{problem_id}/test-cases", response_model=list[TestCaseResponse])
async def get_test_cases(
    problem_id: int,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db)
):
    return await problem_service.get_test_cases(db, problem_id, current_user.id)
