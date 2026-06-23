# DevLab — Demo & Project Guide

**DevLab** is an AI-powered online assessment system for universities, designed to combine interactive learning (guided narrative labs) with formal academic programming assessments (challenges with automatic grading). This guide provides a high-level overview of the project and outlines step-by-step instructions for running and demonstrating the application's key workflows.

---

## 1. Project Overview

Practical programming courses in universities often suffer from manual, time-consuming grading pipelines, delayed feedback, and paper-based practical exams that fail to verify if code actually runs.

**DevLab** addresses this by providing:
- **Guided Mode**: A story-driven, scenario-based learning format featuring inline code editors. Subsequent steps unlock only when the student writes code that meets the checkpoint's expected output.
- **Challenge Mode**: A dual-pane IDE workspace (Monaco Editor) where students write code, run it against sample inputs, and submit it for final automated grading.
- **Lecturer Control Panel**: Dashboards for course creation, enrollment management, assessment configuration, problem authoring (with test cases), and gradebooks.
- **Student Terminal**: Dashboards for tracking course enrollments, accessing live assessments, practicing freely, and reviewing graded submissions.

---

## 2. Technical Stack

*   **Frontend**: React.js, Tailwind CSS, Monaco Editor (VS Code core editor engine), Zustand (State Management), Framer Motion (page and component transitions).
*   **Backend (Architecture)**: FastAPI (REST API), PostgreSQL (primary data store), Redis (sessions/queues), Docker Sandboxing (safe execution for Python, Java, and C++), and in-process SQLite (for SQL problem execution).
*   **Demo Mode Engine**: The current frontend is equipped with a high-fidelity client-side database (`useDemoStore` using Zustand) that automatically initializes and synchronizes with `localStorage` (keys prefixed with `devlab_demo_`). This enables a fully interactive demo experience without requiring a running Docker sandbox or backend container.

---

## 3. Preloaded Demo Data (Preset)

The demo environment is preloaded with data to make the platform look active immediately:
- **Courses**:
  1. *Introduction to Python* (Lecturer: `lecturer@uni.edu`, enrolled students: Kelvin, Seidu)
  2. *Database Systems* (Lecturer: `lecturer@uni.edu`, enrolled students: Kelvin)
  3. *Data Structures* (Lecturer: `lecturer@uni.edu`, enrolled students: Seidu)
- **Problems**:
  - *Two Sum* (Python Challenge - preloaded with test cases and mock submissions)
  - *Valid Palindrome* (Python Challenge)
  - *Variables & Math* (Python Guided Mode lesson)
  - *SQL Murder Mystery* (SQL Guided Mode lesson)
- **Assessments**:
  - *Midterm Practical* (Active/Running: starts 2 hours ago, ends in 2 hours)
  - *SQL Joins Quiz* (Scheduled: starts tomorrow)
  - *Final Lab* (Ended/Expired: ended 46 hours ago)
- **Submissions**: Preloaded test submissions showing successful codes, syntax errors, and test run outcomes.

---

## 4. Run & Install Instructions

Ensure you have [Node.js](https://nodejs.org/) installed, then execute the following commands in the project directory:

```bash
# 1. Install dependencies
npm install

# 2. Run the local Vite dev server
npm run dev
```

By default, the server runs on `http://localhost:5173/` (or the port displayed in your terminal). Open this URL in a modern web browser to access the DevLab landing page.

---

## 5. Mock Authentication Credentials

DevLab uses a smart mock login system. You can test any email and password:
*   **Lecturer Persona**: Any email containing the word `lecturer` (e.g., `lecturer@uni.edu` or `lecturer.admin@uni.edu`).
*   **Student Persona**: Any email **not** containing `lecturer` (e.g., `student@uni.edu`, `kelvin@uni.edu`, or `seidu@uni.edu`).
*   **Password**: Any password (e.g., `password123`).

---

## 6. Step-by-Step Demo Walkthrough

Follow this sequence to demonstrate both the Lecturer and Student experiences.

### Workflow A: The Lecturer Control Panel

#### 1. Login & Dashboard Tour
1. Navigate to the `/login` route.
2. Enter `lecturer@uni.edu` and any password, then click **Sign In**.
3. **Review the Dashboard**:
    *   Observe the live status indicators (Infrastructure status: **Stable**).
    *   Look at the SaaS-style stats counters: **Total Courses**, **Active Assessments**, and **Total Students**, each decorated with dynamic technical pulse charts.
    *   Examine the **Upcoming Assessments** list, **Courses** quick-list, and **Recent Activity Feed** showing recent submissions by Kelvin and Seidu.

#### 2. Create and Manage a Course
1. Click **Manage courses** (or navigate to `/lecturer/courses`).
2. Click **Create New Course** (or `/lecturer/courses/new`).
3. Fill in the course title (e.g., `Advanced Algorithms`), select `Python` as the primary language, write a short description, and save.
4. On the Course Management page for your new course:
    *   Find the **Students** tab.
    *   Enroll a student by entering their email (e.g., `john@uni.edu`) and clicking **Enroll Student**.

#### 3. Create a Timed Assessment
1. Click **Manage Assessments** or navigate to `/lecturer/assessments`.
2. Click **Create Assessment** (or `/lecturer/assessments/new`).
3. Set the Title to `Algorithm Sprint 1`, select `Advanced Algorithms` as the course, set the duration (e.g., `120` minutes), and schedule the start time to be active now (e.g., start: today, end: tomorrow). Click **Create Assessment**.

#### 4. Author a Challenge Problem
1. On the assessment detail page, click **Add Problem**.
2. Set the Title to `Reverse Integer` and select the **Challenge Mode** type.
3. In the description box, write standard markdown explaining the problem constraints.
4. Input the starter code:
   ```python
   def reverse_integer(x: int) -> int:
       # Write your code here
       pass
   ```
5. Add test cases:
    *   *Test Case 1 (Visible)*: Input `123`, Expected output `321`.
    *   *Test Case 2 (Hidden)*: Input `-123`, Expected output `-321` (toggle "Is Hidden" to true).
6. Save the problem. It is now associated with the assessment.

#### 5. Gradebook and Student Activity
1. Go back to the dashboard or `/lecturer/assessments`.
2. Open the **Midterm Practical** details and click **Access Gradebook**.
3. View the grading matrix detailing student names, submission statuses, scores (e.g., `100%`), and elapsed times.
4. Click on **Ankomah Kelvin** to inspect their detailed submission history, view the exact code they submitted for `Two Sum`, and see the test case run breakdowns.

---

### Workflow B: The Student Terminal

#### 1. Login & Dashboard Tour
1. Log out or clear your session, then log in using `student@uni.edu` (or `kelvin@uni.edu`).
2. **Review the Dashboard**:
    *   Observe the **Active Assessments** list showing the *Midterm Practical* with the live time remaining countdown.
    *   View **Upcoming Assessments** and the **Enrolled Courses** list.

#### 2. Taking an Assessment in Challenge Mode
1. Click **Enter Assessment** on the active *Midterm Practical*.
2. Under the problem list, click on **Two Sum**.
3. **IDE Workspace Tour**:
    *   The left pane presents the problem description, constraints, and visible test cases.
    *   The right pane features the **Monaco Editor** containing starter code.
4. **Testing Code**:
    *   Modify the starter code in the editor to insert a syntax error (e.g., delete a colon).
    *   Click **Run Code** and observe the stdout/stderr console showing compiler errors.
    *   Correct the solution by pasting a working implementation:
        ```python
        def two_sum(nums, target):
            seen = {}
            for i, num in enumerate(nums):
                diff = target - num
                if diff in seen:
                    return [seen[diff], i]
                seen[num] = i
            return []
        ```
    *   Click **Run Code** to verify it passes the visible test cases.
    *   Click **Submit** to evaluate it against both visible and hidden test cases, returning an instant feedback badge.

#### 3. Attempting a Guided Mode Lesson
1. Go back to your enrolled courses, select **Introduction to Python** and open it.
2. Click on the **Variables & Math** lesson (or **SQL Murder Mystery** in Database Systems).
3. **Guided Walkthrough Tour**:
    *   Scroll through the narrative blocks introducing variables.
    *   Locate the first embedded code block. Click **Run Code** to run the pre-seeded assignment statements.
    *   Once the terminal outputs the correct output matching the block's expectation, notice how the next section of the guide unlocks dynamically.
    *   Proceed to the second block, follow the hints, and run the code to complete the interactive lesson.

---

## 7. How to Reset the Demo
All actions (created courses, enrolled students, added submissions) are stored in your browser's local storage. To reset the environment to the original default state:
1. Open your browser's developer console (F12).
2. Go to **Application** -> **Local Storage**.
3. Right-click and delete all keys starting with `devlab_demo_` (or click **Clear site data**).
4. Refresh the page to reload the original pre-seeded data.
