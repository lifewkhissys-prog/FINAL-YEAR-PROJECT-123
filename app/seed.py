import asyncio
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.course import Course, CourseLanguage
from app.models.enrollment import Enrollment
from app.models.assessment import Assessment
from app.models.problem import Problem, ProblemType, ProblemLanguage
from app.models.test_case import TestCase
from app.models.submission import Submission, SubmissionStatus
from app.models.test_result import TestResult
from app.models.thesis_critique import ThesisCritique, CritiqueStatus
from app.utils.hashing import hash_password

async def seed_db():
    print("--- STARTING DATABASE SEEDING ---")
    async with SessionLocal() as session:
        # 1. Truncate existing tables to start fresh
        print("Clearing existing tables...")
        await session.execute(text(
            "TRUNCATE TABLE test_results, submissions, test_cases, problems, "
            "assessments, enrollments, courses, thesis_critiques, users "
            "RESTART IDENTITY CASCADE;"
        ))
        await session.commit()

        # 2. Seed Users
        print("Seeding users...")
        lecturer = User(
            name="Dr. Angela Smith",
            email="lecturer@uni.edu",
            password_hash=hash_password("password123"),
            role=UserRole.lecturer
        )
        student_john = User(
            name="John Doe",
            email="student@uni.edu",
            password_hash=hash_password("password123"),
            role=UserRole.student
        )
        student_kelvin = User(
            name="Ankomah Kelvin",
            email="kelvin@uni.edu",
            password_hash=hash_password("password123"),
            role=UserRole.student
        )
        student_seidu = User(
            name="Mohammed Seidu",
            email="seidu@uni.edu",
            password_hash=hash_password("password123"),
            role=UserRole.student
        )
        
        session.add_all([lecturer, student_john, student_kelvin, student_seidu])
        await session.commit()
        await session.refresh(lecturer)
        await session.refresh(student_john)
        await session.refresh(student_kelvin)
        await session.refresh(student_seidu)

        # 3. Seed Courses
        print("Seeding courses...")
        course_python = Course(
            title="Introduction to Python",
            language=CourseLanguage.python,
            description="Basics of programming, variables, loops, control structures, and collections in Python.",
            lecturer_id=lecturer.id
        )
        course_db = Course(
            title="Database Systems",
            language=CourseLanguage.sql,
            description="Relational database concepts, database design, normalization, and complex SQL query formulation.",
            lecturer_id=lecturer.id
        )
        course_ds = Course(
            title="Data Structures",
            language=CourseLanguage.java,
            description="Implementing stacks, queues, linked lists, binary trees, and sorting algorithms in Java.",
            lecturer_id=lecturer.id
        )

        session.add_all([course_python, course_db, course_ds])
        await session.commit()
        await session.refresh(course_python)
        await session.refresh(course_db)
        await session.refresh(course_ds)

        # 4. Seed Enrollments
        print("Seeding enrollments...")
        enrollments = [
            Enrollment(user_id=student_kelvin.id, course_id=course_python.id),
            Enrollment(user_id=student_seidu.id, course_id=course_python.id),
            Enrollment(user_id=student_kelvin.id, course_id=course_db.id),
            Enrollment(user_id=student_seidu.id, course_id=course_ds.id),
            Enrollment(user_id=student_john.id, course_id=course_python.id)
        ]
        session.add_all(enrollments)
        await session.commit()

        # 5. Seed Assessments
        print("Seeding assessments...")
        now = datetime.now(timezone.utc)
        
        # Midterm practical starts 2 hours ago and ends in 5 days
        midterm = Assessment(
            course_id=course_python.id,
            title="Midterm Practical",
            duration_secs=7200, # 120 minutes
            starts_at=now - timedelta(hours=2),
            ends_at=now + timedelta(days=5)
        )
        
        # SQL Joins Quiz starts tomorrow
        sql_quiz = Assessment(
            course_id=course_db.id,
            title="SQL Joins Quiz",
            duration_secs=3600, # 60 minutes
            starts_at=now + timedelta(days=1),
            ends_at=now + timedelta(days=10)
        )
        
        # Final Lab ended 2 days ago
        final_lab = Assessment(
            course_id=course_ds.id,
            title="Final Lab",
            duration_secs=10800, # 180 minutes
            starts_at=now - timedelta(days=5),
            ends_at=now - timedelta(days=2)
        )
        
        session.add_all([midterm, sql_quiz, final_lab])
        await session.commit()
        await session.refresh(midterm)
        await session.refresh(sql_quiz)
        await session.refresh(final_lab)

        # 6. Seed Problems and Test Cases
        print("Seeding problems...")
        
        # Two Sum Challenge Problem
        two_sum_content = {
            "description": (
                "Given an array of integers `nums` and an integer `target`, return "
                "indices of the two numbers such that they add up to `target`.\n\n"
                "You may assume that each input would have exactly one solution, "
                "and you may not use the same element twice.\n\n"
                "**Example:**\n"
                "```python\n"
                "Input: nums = [2,7,11,15], target = 9\n"
                "Output: [0,1]\n"
                "```"
            ),
            "starterCode": (
                "import sys\n"
                "import json\n\n"
                "def two_sum(nums, target):\n"
                "    # Write your solution here\n"
                "    seen = {}\n"
                "    for i, num in enumerate(nums):\n"
                "        diff = target - num\n"
                "        if diff in seen:\n"
                "            return [seen[diff], i]\n"
                "        seen[num] = i\n"
                "    return []\n\n"
                "if __name__ == '__main__':\n"
                "    # Simple runner to read input from stdin\n"
                "    lines = sys.stdin.read().splitlines()\n"
                "    if lines:\n"
                "        nums = json.loads(lines[0])\n"
                "        target = int(lines[1])\n"
                "        print(json.dumps(two_sum(nums, target)))\n"
            )
        }
        
        problem_two_sum = Problem(
            assessment_id=midterm.id,
            title="Two Sum",
            type=ProblemType.challenge,
            language=ProblemLanguage.python,
            content=json.dumps(two_sum_content),
            time_limit_ms=2000,
            memory_limit_mb=256
        )
        session.add(problem_two_sum)
        await session.commit()
        await session.refresh(problem_two_sum)

        tc_two_sum_1 = TestCase(
            problem_id=problem_two_sum.id,
            stdin="[2,7,11,15]\n9",
            expected_stdout="[0, 1]",
            is_hidden=False,
            position=0
        )
        tc_two_sum_2 = TestCase(
            problem_id=problem_two_sum.id,
            stdin="[3,2,4]\n6",
            expected_stdout="[1, 2]",
            is_hidden=False,
            position=1
        )
        tc_two_sum_3 = TestCase(
            problem_id=problem_two_sum.id,
            stdin="[3,3]\n6",
            expected_stdout="[0, 1]",
            is_hidden=True,
            position=2
        )
        session.add_all([tc_two_sum_1, tc_two_sum_2, tc_two_sum_3])
        await session.commit()

        # Valid Palindrome Problem
        palindrome_content = {
            "description": (
                "A phrase is a palindrome if, after converting all uppercase letters into "
                "lowercase letters and removing all non-alphanumeric characters, it reads the "
                "same forward and backward.\n\n"
                "**Example:**\n"
                "```python\n"
                "Input: s = \"A man, a plan, a canal: Panama\"\n"
                "Output: True\n"
                "```"
            ),
            "starterCode": (
                "import sys\n\n"
                "def is_palindrome(s: str) -> bool:\n"
                "    cleaned = ''.join(c.lower() for c in s if c.isalnum())\n"
                "    return cleaned == cleaned[::-1]\n\n"
                "if __name__ == '__main__':\n"
                "    inp = sys.stdin.read().strip()\n"
                "    print(is_palindrome(inp))\n"
            )
        }
        
        problem_palindrome = Problem(
            assessment_id=midterm.id,
            title="Valid Palindrome",
            type=ProblemType.challenge,
            language=ProblemLanguage.python,
            content=json.dumps(palindrome_content),
            time_limit_ms=2000,
            memory_limit_mb=256
        )
        session.add(problem_palindrome)
        await session.commit()
        await session.refresh(problem_palindrome)

        tc_pal_1 = TestCase(
            problem_id=problem_palindrome.id,
            stdin="A man, a plan, a canal: Panama",
            expected_stdout="True",
            is_hidden=False,
            position=0
        )
        tc_pal_2 = TestCase(
            problem_id=problem_palindrome.id,
            stdin="race a car",
            expected_stdout="False",
            is_hidden=False,
            position=1
        )
        session.add_all([tc_pal_1, tc_pal_2])
        await session.commit()

        # SQL Challenge Problem
        sql_content = {
            "description": (
                "Query all employees from the Engineering department with a salary greater than 70000."
            ),
            "starterCode": "SELECT name, salary FROM employees WHERE department = 'Engineering' AND salary > 70000;",
            "seedSql": (
                "CREATE TABLE employees (id INT PRIMARY KEY, name VARCHAR(50), department VARCHAR(50), salary INT);\n"
                "INSERT INTO employees VALUES (1, 'Alice Smith', 'Engineering', 85000);\n"
                "INSERT INTO employees VALUES (2, 'Bob Johnson', 'Marketing', 60000);\n"
                "INSERT INTO employees VALUES (3, 'Charlie Brown', 'Engineering', 95000);\n"
                "INSERT INTO employees VALUES (4, 'Diana Prince', 'HR', 55000);\n"
            )
        }
        
        problem_sql = Problem(
            assessment_id=sql_quiz.id,
            title="High Salary Engineers",
            type=ProblemType.challenge,
            language=ProblemLanguage.sql,
            content=json.dumps(sql_content),
            time_limit_ms=5000,
            memory_limit_mb=256
        )
        session.add(problem_sql)
        await session.commit()
        await session.refresh(problem_sql)

        tc_sql = TestCase(
            problem_id=problem_sql.id,
            stdin=sql_content["seedSql"],
            expected_stdout="Alice Smith,85000\nCharlie Brown,95000",
            is_hidden=False,
            position=0
        )
        session.add(tc_sql)
        await session.commit()

        # 7. Seed Submissions
        print("Seeding submissions...")
        
        # Kelvin Two Sum Submission
        sub_kelvin = Submission(
            user_id=student_kelvin.id,
            problem_id=problem_two_sum.id,
            code="def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []",
            language="python",
            status=SubmissionStatus.completed,
            score=100,
            is_graded=True,
            submitted_at=now - timedelta(hours=1)
        )
        
        # Seidu Two Sum Submission (Slightly slower/different code)
        sub_seidu = Submission(
            user_id=student_seidu.id,
            problem_id=problem_two_sum.id,
            code="def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]",
            language="python",
            status=SubmissionStatus.completed,
            score=100,
            is_graded=True,
            submitted_at=now - timedelta(minutes=45)
        )

        session.add_all([sub_kelvin, sub_seidu])
        await session.commit()
        await session.refresh(sub_kelvin)
        await session.refresh(sub_seidu)

        # Seed TestResults
        tr_k1 = TestResult(submission_id=sub_kelvin.id, test_case_id=tc_two_sum_1.id, passed=True, actual_stdout="[0, 1]", exec_time_ms=12)
        tr_k2 = TestResult(submission_id=sub_kelvin.id, test_case_id=tc_two_sum_2.id, passed=True, actual_stdout="[1, 2]", exec_time_ms=14)
        tr_k3 = TestResult(submission_id=sub_kelvin.id, test_case_id=tc_two_sum_3.id, passed=True, actual_stdout="[0, 1]", exec_time_ms=10)
        
        tr_s1 = TestResult(submission_id=sub_seidu.id, test_case_id=tc_two_sum_1.id, passed=True, actual_stdout="[0, 1]", exec_time_ms=45)
        tr_s2 = TestResult(submission_id=sub_seidu.id, test_case_id=tc_two_sum_2.id, passed=True, actual_stdout="[1, 2]", exec_time_ms=52)
        tr_s3 = TestResult(submission_id=sub_seidu.id, test_case_id=tc_two_sum_3.id, passed=True, actual_stdout="[0, 1]", exec_time_ms=40)
        
        session.add_all([tr_k1, tr_k2, tr_k3, tr_s1, tr_s2, tr_s3])
        await session.commit()

        # 8. Seed Thesis Critiques
        print("Seeding thesis critiques...")
        
        critique1_report = {
            "summary": {
                "overall_score": 82,
                "metrics": {
                    "academic_writing": 80,
                    "methodological_rigor": 75,
                    "literature_review": 88,
                    "structure_coherence": 85
                },
                "general_critique": (
                    "This dissertation titled 'Deep Learning in Code Analysis' demonstrates a robust understanding of deep "
                    "learning concepts applied to parsing static code repositories. The literature review is comprehensive. "
                    "However, the methodology needs clarification regarding hyperparameter choices and baseline models comparison."
                )
            },
            "chapters": [
                {
                    "name": "Chapter 1: Introduction",
                    "score": 85,
                    "findings": [
                        {
                            "category": "academic_writing",
                            "original_text": "We will try to implement this to make it faster.",
                            "correction": "This implementation aims to optimize execution efficiency.",
                            "comment": "Avoid colloquial language and passive intent descriptors. Use formal target-oriented statements.",
                            "severity": "medium"
                        }
                    ]
                },
                {
                    "name": "Chapter 3: Methodology",
                    "score": 75,
                    "findings": [
                        {
                            "category": "methodological_rigor",
                            "original_text": "We picked some parameters arbitrarily.",
                            "correction": "Initial parameters were selected based on heuristic tuning and pilot experiment benchmarks.",
                            "comment": "Arbitrary selection decreases credibility. Describe the empirical process or heuristics used.",
                            "severity": "high"
                        }
                    ]
                }
            ]
        }
        
        critique2_report = {
            "summary": {
                "overall_score": 74,
                "metrics": {
                    "academic_writing": 70,
                    "methodological_rigor": 65,
                    "literature_review": 80,
                    "structure_coherence": 81
                },
                "general_critique": (
                    "The thesis provides a useful survey of sandbox engines, specifically focusing on Judge0. However, "
                    "the experimental setup is lacks detailed resource constraints benchmarks, and the thesis relies on "
                    "basic performance measurements."
                )
            },
            "chapters": [
                {
                    "name": "Chapter 2: Literature Review",
                    "score": 80,
                    "findings": [
                        {
                            "category": "literature_review",
                            "original_text": "There are some works by Smith (2018) doing this, and also Jones (2020).",
                            "correction": "Smith (2018) and Jones (2020) pioneered parallel sandboxing platforms, establishing...",
                            "comment": "Synthesize the papers together. Do not write a simple laundry list of citations.",
                            "severity": "medium"
                        }
                    ]
                }
            ]
        }

        critique_1 = ThesisCritique(
            lecturer_id=lecturer.id,
            candidate_name="Jane Student",
            programme="M.Sc. Computer Science",
            thesis_title="Deep Learning in Code Analysis",
            filename="thesis_paper.pdf",
            status=CritiqueStatus.completed,
            report_json=json.dumps(critique1_report),
            created_at=now - timedelta(days=2)
        )
        
        critique_2 = ThesisCritique(
            lecturer_id=lecturer.id,
            candidate_name="Kelvin Ankomah",
            programme="B.Sc. Computer Engineering",
            thesis_title="Automatic Grading with Sandboxed Environments",
            filename="sandbox_grading_v3.docx",
            status=CritiqueStatus.completed,
            report_json=json.dumps(critique2_report),
            created_at=now - timedelta(hours=3)
        )

        session.add_all([critique_1, critique_2])
        await session.commit()

        print("--- SEEDING COMPLETED SUCCESSFULLY ---")

if __name__ == '__main__':
    asyncio.run(seed_db())
