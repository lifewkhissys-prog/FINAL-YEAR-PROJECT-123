import time
import requests

BASE_URL = "http://localhost:8000"  # Container internal port

def test_app_integration():
    print("--- STARTING APP DATABASE SYSTEM INTEGRATION TEST (SQL) ---")
    session = requests.Session()

    # 1. Register Lecturer
    print("1. Registering lecturer...")
    reg_lec = session.post(f"{BASE_URL}/auth/register", json={
        "name": "Dr. Smith",
        "email": "smith@devlab.edu",
        "password": "password123",
        "role": "lecturer"
    })
    print(f"   Status: {reg_lec.status_code}")
    assert reg_lec.status_code in (201, 409)

    # 2. Register Student
    print("2. Registering student...")
    reg_std = session.post(f"{BASE_URL}/auth/register", json={
        "name": "Jane Doe",
        "email": "jane@devlab.edu",
        "password": "password123",
        "role": "student"
    })
    print(f"   Status: {reg_std.status_code}")
    assert reg_std.status_code in (201, 409)

    # 3. Login Lecturer
    print("3. Logging in lecturer...")
    log_lec = session.post(f"{BASE_URL}/auth/login", json={
        "email": "smith@devlab.edu",
        "password": "password123"
    })
    assert log_lec.status_code == 200
    lec_token = log_lec.json()["access_token"]
    lec_headers = {"Authorization": f"Bearer {lec_token}"}

    # 4. Login Student
    print("4. Logging in student...")
    log_std = session.post(f"{BASE_URL}/auth/login", json={
        "email": "jane@devlab.edu",
        "password": "password123"
    })
    assert log_std.status_code == 200
    std_token = log_std.json()["access_token"]
    std_headers = {"Authorization": f"Bearer {std_token}"}

    # 5. Create Course (Lecturer)
    print("5. Creating course as lecturer...")
    course_res = session.post(f"{BASE_URL}/courses", headers=lec_headers, json={
        "title": "CS102: Data Structures",
        "description": "Learn SQL queries.",
        "language": "sql"
    })
    print(f"   Status: {course_res.status_code}, Response: {course_res.json()}")
    assert course_res.status_code == 201
    course_data = course_res.json()
    course_id = course_data["id"]
    join_code = course_data["join_code"]
    print(f"   Created Course {course_id} with Join Code: {join_code}")
    assert join_code is not None

    # 6. Self-enroll Course (Student using Join Code)
    print("6. Enrolling student via join code...")
    enroll_res = session.post(f"{BASE_URL}/courses/enroll", headers=std_headers, json={
        "join_code": join_code
      })
    print(f"   Status: {enroll_res.status_code}, Response: {enroll_res.json()}")
    assert enroll_res.status_code == 201
    assert enroll_res.json()["course_id"] == course_id

    # 7. Create Assessment (Lecturer)
    print("7. Creating assessment...")
    assessment_res = session.post(f"{BASE_URL}/assessments", headers=lec_headers, json={
        "courseId": course_id,
        "title": "SQL Assignment 1",
        "startsAt": "2026-07-01T00:00:00Z",
        "endsAt": "2026-07-30T00:00:00Z"
    })
    print(f"   Status: {assessment_res.status_code}")
    assert assessment_res.status_code == 201
    assessment_id = assessment_res.json()["id"]

    # 8. Create Problem under Assessment (Lecturer)
    print("8. Creating coding problem...")
    prob_res = session.post(f"{BASE_URL}/problems", headers=lec_headers, json={
        "assessmentId": assessment_id,
        "title": "Query All Users",
        "type": "challenge",
        "language": "sql",
        "content": {
            "description": "Select all user names from the users table.",
            "starterCode": "SELECT name FROM users;"
        }
    })
    print(f"   Status: {prob_res.status_code}")
    assert prob_res.status_code == 201
    problem_id = prob_res.json()["id"]

    # 9. Add Test Cases to Problem (Lecturer)
    # Stdin is the seed sql script, expectedStdout is the expected CSV output of the query
    print("9. Adding test cases...")
    tc_res = session.put(f"{BASE_URL}/problems/{problem_id}/test-cases", headers=lec_headers, json=[
        {
            "stdin": "CREATE TABLE users(id INTEGER, name TEXT); INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');",
            "expectedStdout": "Alice\nBob",
            "isHidden": False,
            "position": 0
        }
    ])
    print(f"   Status: {tc_res.status_code}")
    assert tc_res.status_code == 200

    # 10. Run/Test Code Submission (Student)
    print("10. Testing code submission run...")
    run_res = session.post(f"{BASE_URL}/submissions/run", headers=std_headers, json={
        "problem_id": problem_id,
        "code": "SELECT name FROM users;",
        "language": "sql"
    })
    print(f"    Status: {run_res.status_code}, Response: {run_res.json()}")
    assert run_res.status_code == 200
    assert run_res.json()["status"] == "completed"
    assert run_res.json()["score"] == 1

    # 11. Submit Code Submission (Student)
    print("11. Testing code submission submit...")
    submit_res = session.post(f"{BASE_URL}/submissions/submit", headers=std_headers, json={
        "problem_id": problem_id,
        "code": "SELECT name FROM users;",
        "language": "sql"
    })
    print(f"    Status: {submit_res.status_code}, Response: {submit_res.json()}")
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "completed"

    # 12. Fetch Lecturer Dashboard Stats
    print("12. Fetching lecturer dashboard...")
    lect_dash_res = session.get(f"{BASE_URL}/lecturer/dashboard", headers=lec_headers)
    print(f"    Status: {lect_dash_res.status_code}, Response: {lect_dash_res.json()}")
    assert lect_dash_res.status_code == 200
    assert lect_dash_res.json()["totalCourses"] >= 1
    assert lect_dash_res.json()["totalStudents"] >= 1

    # 13. Fetch Student Dashboard Stats
    print("13. Fetching student dashboard...")
    stud_dash_res = session.get(f"{BASE_URL}/student/dashboard", headers=std_headers)
    print(f"    Status: {stud_dash_res.status_code}, Response: {stud_dash_res.json()}")
    assert stud_dash_res.status_code == 200
    assert len(stud_dash_res.json()["enrolledCourses"]) >= 1

    # 14. Fetch Student Submissions List
    print("14. Fetching student submissions list...")
    sub_list_res = session.get(f"{BASE_URL}/student/submissions", headers=std_headers)
    print(f"    Status: {sub_list_res.status_code}, Response: {sub_list_res.json()}")
    assert sub_list_res.status_code == 200
    assert len(sub_list_res.json()) > 0

    print("--- ALL APP INTEGRATION TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    test_app_integration()
