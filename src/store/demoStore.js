import { create } from 'zustand';

// Preloaded mock database
const INITIAL_COURSES = [
  {
    id: '1',
    title: 'Introduction to Python',
    lecturer: 'lecturer@uni.edu',
    description: 'Learn the fundamentals of Python programming, from syntax to control flows.',
    students: ['student@uni.edu', 'kelvin@uni.edu', 'seidu@uni.edu'],
    assessments: ['a1'],
    problemIds: ['101', '103']
  },
  {
    id: '2',
    title: 'Database Systems',
    lecturer: 'lecturer@uni.edu',
    description: 'Master SQL databases, schema design, and complex queries.',
    students: ['student@uni.edu', 'kelvin@uni.edu'],
    assessments: ['a2'],
    problemIds: ['104']
  },
  {
    id: '3',
    title: 'Data Structures',
    lecturer: 'lecturer@uni.edu',
    description: 'Explore stacks, queues, trees, and algorithm optimization.',
    students: ['student@uni.edu', 'seidu@uni.edu'],
    assessments: ['a3'],
    problemIds: []
  }
];

const INITIAL_PROBLEMS = {
  '101': {
    id: '101',
    title: 'Two Sum',
    type: 'challenge',
    language: 'python',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.`,
    starterCode: `def two_sum(nums, target):
    # Write your code here
    pass`,
    testCases: [
      { id: 1, stdin: '[2,7,11,15]\n9', expectedStdout: '[0, 1]', isHidden: false },
      { id: 2, stdin: '[3,2,4]\n6', expectedStdout: '[1, 2]', isHidden: false },
      { id: 3, stdin: '[3,3]\n6', expectedStdout: '[0, 1]', isHidden: true }
    ]
  },
  '102': {
    id: '102',
    title: 'Valid Palindrome',
    type: 'challenge',
    language: 'python',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    description: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.`,
    starterCode: `def is_palindrome(s: str) -> bool:
    # Write your code here
    pass`,
    testCases: [
      { id: 1, stdin: '"A man, a plan, a canal: Panama"', expectedStdout: 'true', isHidden: false },
      { id: 2, stdin: '"race a car"', expectedStdout: 'false', isHidden: false }
    ]
  },
  '103': {
    id: '103',
    title: 'Variables & Math',
    type: 'guided',
    language: 'python',
    description: 'Guided Python programming walkthrough on basic variables and mathematics.',
    blocks: [
      { id: 1, type: 'text', content: '### Welcome to Python Variables\nIn Python, variables are created when you assign a value to it. There is no command for declaring a variable.' },
      { id: 2, type: 'code', starterCode: 'x = 5\ny = "Hello"\nprint(x)\nprint(y)', expectedOutput: "5\nHello\n", hint: 'Just run the code to see x and y printed.' },
      { id: 3, type: 'text', content: '### Math Operations\nYou can perform addition (+), subtraction (-), multiplication (*), division (/), and power (**) operations.' },
      { id: 4, type: 'code', starterCode: 'a = 10\nb = 3\n# Calculate and print a divided by b\nprint(a / b)', expectedOutput: "3.3333333333333335\n", hint: 'Perform division and print it.' }
    ]
  },
  '104': {
    id: '104',
    title: 'SQL Murder Mystery',
    type: 'guided',
    language: 'sql',
    description: 'A mysterious crime has occurred, and the detective needs your SQL skills to query the database and find the culprit.',
    blocks: [
      { id: 1, type: 'text', content: '### The Crime Scene\nWe need to search the crime scene report database for a murder that took place on **Jan 15, 2018** in **SQL City**.' },
      { id: 2, type: 'code', starterCode: "SELECT * \nFROM crime_scene_report \nWHERE date = 20180115 \n  AND type = 'murder' \n  AND city = 'SQL City';", expectedOutput: "Security footage shows two witnesses: one lives in the last house on Northwestern Dr, and the other named Annabel lives on Franklin St.\n", hint: "Use date = 20180115, type = 'murder' and city = 'SQL City'" },
      { id: 3, type: 'text', content: '### Find the Witnesses\nLet\'s check the address details for the first witness: lives in the "last house" on Northwestern Dr.' },
      { id: 4, type: 'code', starterCode: "SELECT * \nFROM person \nWHERE address_street_name = 'Northwestern Dr' \nORDER BY address_number DESC \nLIMIT 1;", expectedOutput: "id: 14887 | name: Morty Schapiro | license_id: 118009 | address_number: 4919\n", hint: 'Order by address_number DESC to find the last house.' }
    ]
  }
};

const INITIAL_ASSESSMENTS = [
  {
    id: 'a1',
    courseId: '1',
    title: 'Midterm Practical',
    startsAt: new Date(Date.now() - 3600000 * 2).toISOString(), // Started 2h ago
    endsAt: new Date(Date.now() + 3600000 * 2).toISOString(),   // Ends in 2h
    problemIds: ['101', '102']
  },
  {
    id: 'a2',
    courseId: '2',
    title: 'SQL Joins Quiz',
    startsAt: new Date(Date.now() + 3600000 * 24).toISOString(), // Tomorrow
    endsAt: new Date(Date.now() + 3600000 * 26).toISOString(),
    problemIds: ['104']
  },
  {
    id: 'a3',
    courseId: '3',
    title: 'Final Lab',
    startsAt: new Date(Date.now() - 3600000 * 48).toISOString(), // Ended
    endsAt: new Date(Date.now() - 3600000 * 46).toISOString(),
    problemIds: ['101']
  }
];

const INITIAL_SUBMISSIONS = [
  {
    id: 's1',
    studentEmail: 'kelvin@uni.edu',
    studentName: 'Ankomah Kelvin',
    problemId: '101',
    problemTitle: 'Two Sum',
    assessmentId: 'a1',
    course: 'Introduction to Python',
    type: 'challenge',
    language: 'python',
    status: 'completed',
    score: '100%',
    time: '15 mins ago',
    code: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`,
    is_graded: true,
    testCases: [
      { id: 1, status: 'passed', executionTime: '45ms' },
      { id: 2, status: 'passed', executionTime: '52ms' },
      { id: 3, status: 'passed', executionTime: '48ms' }
    ]
  },
  {
    id: 's2',
    studentEmail: 'kelvin@uni.edu',
    studentName: 'Ankomah Kelvin',
    problemId: '102',
    problemTitle: 'Valid Palindrome',
    assessmentId: 'a1',
    course: 'Introduction to Python',
    type: 'challenge',
    language: 'python',
    status: 'completed',
    score: '100%',
    time: '10 mins ago',
    code: `def is_palindrome(s: str) -> bool:
    clean = "".join(c.lower() for c in s if c.isalnum())
    return clean == clean[::-1]`,
    is_graded: true,
    testCases: [
      { id: 1, status: 'passed', executionTime: '30ms' },
      { id: 2, status: 'passed', executionTime: '32ms' }
    ]
  },
  {
    id: 's3',
    studentEmail: 'seidu@uni.edu',
    studentName: 'Mahfuz Abgor Seidu',
    problemId: '101',
    problemTitle: 'Two Sum',
    assessmentId: 'a1',
    course: 'Introduction to Python',
    type: 'challenge',
    language: 'python',
    status: 'error',
    score: '0%',
    time: '45 mins ago',
    code: `def two_sum(nums, target):
    # syntax error intentionally for demo
    for i in nums
        pass`,
    is_graded: true,
    error: 'SyntaxError: invalid syntax (line 3)',
    testCases: []
  },
  {
    id: 's4',
    studentEmail: 'seidu@uni.edu',
    studentName: 'Mahfuz Abgor Seidu',
    problemId: '101',
    problemTitle: 'Two Sum',
    assessmentId: 'a1',
    course: 'Introduction to Python',
    type: 'challenge',
    language: 'python',
    status: 'completed',
    score: '100%',
    time: '30 mins ago',
    code: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`,
    is_graded: true,
    testCases: [
      { id: 1, status: 'passed', executionTime: '42ms' },
      { id: 2, status: 'passed', executionTime: '40ms' },
      { id: 3, status: 'passed', executionTime: '45ms' }
    ]
  }
];

const INITIAL_STUDENT_PROFILES = [
  { email: 'student@uni.edu', name: 'Student Demo' },
  { email: 'kelvin@uni.edu', name: 'Ankomah Kelvin' },
  { email: 'seidu@uni.edu', name: 'Mahfuz Abgor Seidu' },
  { email: 'john@uni.edu', name: 'John Doe' }
];

const getStored = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
};

const saveStored = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
};

export const useDemoStore = create((set, get) => ({
  courses: getStored('devlab_demo_courses', INITIAL_COURSES),
  problems: getStored('devlab_demo_problems', INITIAL_PROBLEMS),
  assessments: getStored('devlab_demo_assessments', INITIAL_ASSESSMENTS),
  submissions: getStored('devlab_demo_submissions', INITIAL_SUBMISSIONS),
  studentsList: getStored('devlab_demo_students', INITIAL_STUDENT_PROFILES),

  // Save utility helper
  syncToStorage: () => {
    const state = get();
    saveStored('devlab_demo_courses', state.courses);
    saveStored('devlab_demo_problems', state.problems);
    saveStored('devlab_demo_assessments', state.assessments);
    saveStored('devlab_demo_submissions', state.submissions);
    saveStored('devlab_demo_students', state.studentsList);
  },

  // Courses Actions
  createCourse: (courseData) => {
    const newCourse = {
      ...courseData,
      id: Math.random().toString(36).substr(2, 9),
      students: courseData.students || [],
      assessments: courseData.assessments || [],
      problemIds: courseData.problemIds || []
    };
    set((state) => ({ courses: [...state.courses, newCourse] }));
    get().syncToStorage();
    return newCourse;
  },

  updateCourse: (courseId, courseData) => {
    set((state) => ({
      courses: state.courses.map((c) => (c.id === courseId ? { ...c, ...courseData } : c))
    }));
    get().syncToStorage();
  },

  deleteCourse: (courseId) => {
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== courseId),
      assessments: state.assessments.filter((a) => a.courseId !== courseId)
    }));
    get().syncToStorage();
  },

  enrollStudent: (courseId, email) => {
    // Add student to system if new
    let students = [...get().studentsList];
    if (!students.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      const name = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ');
      const capitalized = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      students.push({ email, name: capitalized || 'External Student' });
    }

    set((state) => ({
      studentsList: students,
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          const enrolled = c.students || [];
          if (!enrolled.includes(email)) {
            return { ...c, students: [...enrolled, email] };
          }
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  removeStudent: (courseId, email) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          return { ...c, students: (c.students || []).filter((s) => s !== email) };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  // Assessments Actions
  createAssessment: (assessmentData) => {
    const newAssessment = {
      ...assessmentData,
      id: Math.random().toString(36).substr(2, 9),
      problemIds: assessmentData.problemIds || []
    };
    set((state) => ({
      assessments: [...state.assessments, newAssessment],
      courses: state.courses.map((c) => {
        if (c.id === assessmentData.courseId) {
          const list = c.assessments || [];
          return { ...c, assessments: [...list, newAssessment.id] };
        }
        return c;
      })
    }));
    get().syncToStorage();
    return newAssessment;
  },

  updateAssessment: (assessmentId, assessmentData) => {
    set((state) => ({
      assessments: state.assessments.map((a) => (a.id === assessmentId ? { ...a, ...assessmentData } : a))
    }));
    get().syncToStorage();
  },

  deleteAssessment: (assessmentId) => {
    const assessment = get().assessments.find((a) => a.id === assessmentId);
    if (!assessment) return;

    set((state) => ({
      assessments: state.assessments.filter((a) => a.id !== assessmentId),
      courses: state.courses.map((c) => {
        if (c.id === assessment.courseId) {
          return { ...c, assessments: (c.assessments || []).filter((aId) => aId !== assessmentId) };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  // Problems Actions
  saveProblem: (problemData) => {
    const problemId = problemData.id || Math.random().toString(36).substr(2, 9);
    const updatedProblem = {
      ...problemData,
      id: problemId
    };

    set((state) => ({
      problems: {
        ...state.problems,
        [problemId]: updatedProblem
      }
    }));

    // If assessmentId is specified, ensure it is added to the assessment
    if (problemData.assessmentId) {
      set((state) => ({
        assessments: state.assessments.map((a) => {
          if (a.id === problemData.assessmentId) {
            const list = a.problemIds || [];
            if (!list.includes(problemId)) {
              return { ...a, problemIds: [...list, problemId] };
            }
          }
          return a;
        })
      }));
    }

    // If courseId is specified, ensure it is in the course problems list
    if (problemData.courseId) {
      set((state) => ({
        courses: state.courses.map((c) => {
          if (c.id === problemData.courseId) {
            const list = c.problemIds || [];
            if (!list.includes(problemId)) {
              return { ...c, problemIds: [...list, problemId] };
            }
          }
          return c;
        })
      }));
    }

    get().syncToStorage();
    return updatedProblem;
  },

  deleteProblem: (problemId) => {
    set((state) => {
      const nextProblems = { ...state.problems };
      delete nextProblems[problemId];

      return {
        problems: nextProblems,
        assessments: state.assessments.map((a) => ({
          ...a,
          problemIds: (a.problemIds || []).filter((id) => id !== problemId)
        })),
        courses: state.courses.map((c) => ({
          ...c,
          problemIds: (c.problemIds || []).filter((id) => id !== problemId)
        }))
      };
    });
    get().syncToStorage();
  },

  // Submissions Actions
  addSubmission: (submissionData) => {
    const newSubmission = {
      ...submissionData,
      id: Math.random().toString(36).substr(2, 9),
      time: 'Just now'
    };
    set((state) => ({
      submissions: [newSubmission, ...state.submissions]
    }));
    get().syncToStorage();
    return newSubmission;
  }
}));
