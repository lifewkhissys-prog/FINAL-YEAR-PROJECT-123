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
    problemIds: ['101', '103'],
    joinCode: 'PY-101',
    slides: [
      {
        id: 's1',
        title: 'Lecture 1: Introduction to Python Variables and Types',
        description: 'Covers variables, syntax structure, basic arithmetic operators, and core datatypes.',
        programmingLanguage: 'python',
        fileName: 'lecture_01_intro_python.pdf',
        uploadedAt: '2026-06-01T10:00:00Z',
        pages: [
          {
            title: 'Welcome to Python',
            content: 'Python is a high-level, interpreted, general-purpose programming language. Created by Guido van Rossum and first released in 1991. It emphasizes code readability and simplicity.'
          },
          {
            title: 'Variables and Assignment',
            content: 'In Python, we do not need to declare variable types. Variable declaration is automatic when you assign a value.\n\nExample:\nx = 5\nname = "KNUST"\n\nVariable names must start with a letter or underscore, and are case-sensitive.'
          },
          {
            title: 'Basic Data Types',
            content: '- Integers: x = 10\n- Floating point numbers: y = 20.5\n- Strings: s = "Hello World"\n- Booleans: active = True\n- Lists: items = [1, 2, 3]'
          }
        ]
      },
      {
        id: 's2',
        title: 'Lecture 2: Control Flow and Conditionals',
        description: 'Understanding if, elif, else statements and logical operators in Python.',
        programmingLanguage: 'python',
        fileName: 'lecture_02_python_control_flow.pdf',
        uploadedAt: '2026-06-05T10:00:00Z',
        pages: [
          {
            title: 'If Statements',
            content: 'Python uses indentation to define code blocks instead of curly braces.\n\nExample:\nif x > 0:\n    print("Positive")\nelse:\n    print("Non-positive")'
          },
          {
            title: 'Boolean Operators',
            content: 'Use `and`, `or`, and `not` keywords for logical operations in conditionals.\n\nExample:\nif x > 0 and x < 10:\n    print("Single digit positive number")'
          }
        ]
      }
    ]
  },
  {
    id: '2',
    title: 'Database Systems',
    lecturer: 'lecturer@uni.edu',
    description: 'Master SQL databases, schema design, and complex queries.',
    students: ['student@uni.edu', 'kelvin@uni.edu'],
    assessments: ['a2'],
    problemIds: ['104'],
    joinCode: 'DB-201',
    slides: [
      {
        id: 's3',
        title: 'Lecture 1: Relational Model & SQL Basics',
        description: 'An overview of the relational databases, tables, keys, and writing basic SELECT queries.',
        programmingLanguage: 'sql',
        fileName: 'lecture_01_sql_basics.pdf',
        uploadedAt: '2026-06-10T09:30:00Z',
        pages: [
          {
            title: 'What is a Relational Database?',
            content: 'A database structure organized as tables containing columns and rows. Tables represent entities, and relationships are built using Primary Keys and Foreign Keys.'
          },
          {
            title: 'Basic SQL SELECT syntax',
            content: 'Syntax:\nSELECT column1, column2 FROM table_name WHERE condition;\n\nExample:\nSELECT name, salary FROM employees WHERE department = \'Engineering\';'
          }
        ]
      }
    ]
  },
  {
    id: '3',
    title: 'Data Structures',
    lecturer: 'lecturer@uni.edu',
    description: 'Explore stacks, queues, trees, and algorithm optimization.',
    students: ['student@uni.edu', 'seidu@uni.edu'],
    assessments: ['a3'],
    problemIds: [],
    joinCode: 'DS-301',
    slides: []
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
  },
  '105': {
    id: '105',
    title: 'CSS Box Model',
    type: 'mcq',
    interactionMode: 'direct',
    difficulty: 'easy',
    description: 'Which CSS property controls the space inside the border of an element?',
    choices: [
      { text: 'margin', isCorrect: false },
      { text: 'padding', isCorrect: true },
      { text: 'border', isCorrect: false },
      { text: 'spacing', isCorrect: false }
    ],
    explanation: 'Padding is the space inside the border, whereas margin is the space outside the border.',
    points: 10
  },
  '106': {
    id: '106',
    title: 'Algorithm Complexity Analysis',
    type: 'short_answer',
    interactionMode: 'guided',
    difficulty: 'medium',
    steps: [
      {
        prompt: 'What is the time complexity of searching in a balanced binary search tree in the worst case?',
        gradingMode: 'keyword_match',
        keywords: ['O(log n)', 'logarithmic', 'log n'],
        showPrevAnswer: false
      },
      {
        prompt: 'Why is it O(log n)? Explain the division of search space.',
        gradingMode: 'manual',
        keywords: [],
        showPrevAnswer: true
      }
    ],
    points: 20
  },
  '107': {
    id: '107',
    title: 'SQL Mystery Hunt',
    type: 'sql_problem',
    interactionMode: 'exploratory',
    difficulty: 'hard',
    description: 'A valuable artifact was stolen from the museum. Find the thief using the database.',
    schemaSql: 'CREATE TABLE logs (id INT, staff_id INT, room VARCHAR(50), timestamp TIMESTAMP);\nCREATE TABLE staff (id INT, name VARCHAR(50), role VARCHAR(50));',
    seedSql: "INSERT INTO staff VALUES (1, 'Alice Smith', 'Curator'), (2, 'Bob Johnson', 'Janitor'), (3, 'Charlie Brown', 'Security');\nINSERT INTO logs VALUES (1, 2, 'Exhibition Hall', '2018-01-15 22:15:00'), (2, 1, 'Exhibition Hall', '2018-01-15 14:00:00');",
    finalAnswerSchema: [
      { field: 'suspect_name', label: 'Suspect Name' },
      { field: 'time_of_theft', label: 'Time of Theft' }
    ],
    finalAnswerKey: {
      suspect_name: 'Bob Johnson',
      time_of_theft: '22:15'
    },
    solutionQuery: "SELECT s.name, l.timestamp FROM logs l JOIN staff s ON l.staff_id = s.id WHERE l.room = 'Exhibition Hall' AND l.timestamp LIKE '%22:15%';",
    points: 30
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
  courses: getStored('devlab_demo_courses', INITIAL_COURSES).map((c) => {
    // 1. Backfill joinCode
    let code = c.joinCode;
    if (!code) {
      if (c.id === '1') code = 'PY-101';
      else if (c.id === '2') code = 'DB-201';
      else if (c.id === '3') code = 'DS-301';
      else code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // 2. Backfill modules
    let mods = c.modules;
    if (!mods || mods.length === 0) {
      if (c.id === '1') {
        mods = [
          {
            id: 'm1',
            title: 'Variables and Data Types',
            description: 'Understand variables, strings, numbers, and basic expressions in Python.',
            slideIds: ['s1'],
            problemIds: ['101'],
            assessmentIds: []
          },
          {
            id: 'm2',
            title: 'Control Flow and Loops',
            description: 'Master logical branches and loop iteration controls.',
            slideIds: ['s2'],
            problemIds: ['103'],
            assessmentIds: ['a1']
          }
        ];
      } else if (c.id === '2') {
        mods = [
          {
            id: 'm3',
            title: 'Relational Model & SQL Basics',
            description: 'Learn SQL databases, structures, primary/foreign keys, and basic SELECT queries.',
            slideIds: ['s3'],
            problemIds: ['104'],
            assessmentIds: ['a2']
          }
        ];
      } else if (c.id === '3') {
        mods = [
          {
            id: 'm4',
            title: 'Linear Data Structures',
            description: 'Learn arrays, stacks, queues, and linked lists.',
            slideIds: [],
            problemIds: [],
            assessmentIds: ['a3']
          }
        ];
      } else {
        mods = [
          {
            id: 'm-' + Math.random().toString(36).substring(2, 7),
            title: 'General Resources',
            description: 'Course lectures and practice problems.',
            slideIds: c.slides ? c.slides.map(s => s.id) : [],
            problemIds: c.problemIds || [],
            assessmentIds: c.assessments || []
          }
        ];
      }
    }

    return { ...c, joinCode: code, modules: mods };
  }),
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
    const randomCode = 'KN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newCourse = {
      ...courseData,
      id: Math.random().toString(36).substr(2, 9),
      students: courseData.students || [], // Empty by default, allows self-enrollment/join codes
      assessments: courseData.assessments || [],
      problemIds: courseData.problemIds || [],
      joinCode: courseData.joinCode || randomCode
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

  enrollStudentWithCode: (joinCode, email) => {
    const trimmedCode = joinCode.trim().toUpperCase();
    const course = get().courses.find(c => c.joinCode.toUpperCase() === trimmedCode);
    if (!course) {
      throw new Error("No course found with that enrollment code.");
    }

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
        if (c.joinCode.toUpperCase() === trimmedCode) {
          const enrolled = c.students || [];
          if (!enrolled.includes(email)) {
            return { ...c, students: [...enrolled, email] };
          }
        }
        return c;
      })
    }));
    get().syncToStorage();
    return course;
  },

  unenrollStudent: (courseId, email) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          return { ...c, students: (c.students || []).filter((s) => s.toLowerCase() !== email.toLowerCase()) };
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
          return { ...c, students: (c.students || []).filter((s) => s.toLowerCase() !== email.toLowerCase()) };
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

  linkProblemsToAssessment: (assessmentId, problemIds) => {
    set((state) => ({
      assessments: state.assessments.map((a) => {
        if (a.id === assessmentId) {
          const currentList = a.problemIds || [];
          const newList = [...currentList];
          problemIds.forEach((pId) => {
            if (!newList.includes(pId)) {
              newList.push(pId);
            }
          });
          return { ...a, problemIds: newList };
        }
        return a;
      })
    }));
    get().syncToStorage();
  },

  unlinkProblemFromAssessment: (assessmentId, problemId) => {
    set((state) => ({
      assessments: state.assessments.map((a) => {
        if (a.id === assessmentId) {
          return {
            ...a,
            problemIds: (a.problemIds || []).filter((id) => id !== problemId)
          };
        }
        return a;
      })
    }));
    get().syncToStorage();
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

  linkProblemsToCourse: (courseId, problemIds) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          const currentList = c.problemIds || [];
          const newList = [...currentList];
          problemIds.forEach((pId) => {
            if (!newList.includes(pId)) {
              newList.push(pId);
            }
          });

          // Also auto-assign to the first module if exists
          const mods = c.modules || [];
          let updatedMods = [...mods];
          if (updatedMods.length > 0) {
            const firstMod = updatedMods[0];
            const mProblems = firstMod.problemIds || [];
            const newMProblems = [...mProblems];
            problemIds.forEach((pId) => {
              if (!newMProblems.includes(pId)) {
                newMProblems.push(pId);
              }
            });
            updatedMods[0] = { ...firstMod, problemIds: newMProblems };
          }

          return { ...c, problemIds: newList, modules: updatedMods };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  unlinkProblemFromCourse: (courseId, problemId) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          // Remove from course and all modules
          const currentMods = c.modules || [];
          const updatedMods = currentMods.map(m => ({
            ...m,
            problemIds: (m.problemIds || []).filter(id => id !== problemId)
          }));
          return {
            ...c,
            problemIds: (c.problemIds || []).filter((id) => id !== problemId),
            modules: updatedMods
          };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  addSlideToCourse: (courseId, slide) => {
    const newSlide = {
      ...slide,
      id: 's-' + Math.random().toString(36).substring(2, 7),
      uploadedAt: new Date().toISOString()
    };
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          const currentSlides = c.slides || [];
          const updatedSlides = [...currentSlides, newSlide];

          // Auto-assign to the first module
          const mods = c.modules || [];
          let updatedMods = [...mods];
          if (updatedMods.length > 0) {
            const firstMod = updatedMods[0];
            const mSlides = firstMod.slideIds || [];
            updatedMods[0] = { ...firstMod, slideIds: [...mSlides, newSlide.id] };
          }

          return { ...c, slides: updatedSlides, modules: updatedMods };
        }
        return c;
      })
    }));
    get().syncToStorage();
    return newSlide;
  },

  removeSlideFromCourse: (courseId, slideId) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          const currentSlides = c.slides || [];
          const currentMods = c.modules || [];
          return {
            ...c,
            slides: currentSlides.filter((s) => s.id !== slideId),
            modules: currentMods.map(m => ({
              ...m,
              slideIds: (m.slideIds || []).filter(id => id !== slideId)
            }))
          };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  updateSlideInCourse: (courseId, slideId, slideData) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          const currentSlides = c.slides || [];
          return {
            ...c,
            slides: currentSlides.map((s) => s.id === slideId ? { ...s, ...slideData } : s)
          };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  // Module/Mini-course actions
  createModule: (courseId, moduleData) => {
    const newModule = {
      id: 'm-' + Math.random().toString(36).substring(2, 7),
      title: moduleData.title,
      description: moduleData.description || '',
      slideIds: [],
      problemIds: [],
      assessmentIds: []
    };
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          const currentMods = c.modules || [];
          return { ...c, modules: [...currentMods, newModule] };
        }
        return c;
      })
    }));
    get().syncToStorage();
    return newModule;
  },

  updateModule: (courseId, moduleId, moduleData) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          const currentMods = c.modules || [];
          return {
            ...c,
            modules: currentMods.map((m) => m.id === moduleId ? { ...m, ...moduleData } : m)
          };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  deleteModule: (courseId, moduleId) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          const currentMods = c.modules || [];
          return {
            ...c,
            modules: currentMods.filter((m) => m.id !== moduleId)
          };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  linkProblemToModule: (courseId, moduleId, problemId) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          // Add to global course list
          const cProblems = c.problemIds || [];
          const updatedCProblems = cProblems.includes(problemId) ? cProblems : [...cProblems, problemId];
          
          // Add to module list
          const currentMods = c.modules || [];
          const updatedMods = currentMods.map((m) => {
            if (m.id === moduleId) {
              const mProblems = m.problemIds || [];
              return {
                ...m,
                problemIds: mProblems.includes(problemId) ? mProblems : [...mProblems, problemId]
              };
            }
            return m;
          });
          return { ...c, problemIds: updatedCProblems, modules: updatedMods };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  unlinkProblemFromModule: (courseId, moduleId, problemId) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          // Remove from module
          const currentMods = c.modules || [];
          const updatedMods = currentMods.map((m) => {
            if (m.id === moduleId) {
              return {
                ...m,
                problemIds: (m.problemIds || []).filter(id => id !== problemId)
              };
            }
            return m;
          });

          // Check if this problem is still used in other modules. If not, remove from course global list too
          const stillUsed = updatedMods.some(m => m.problemIds && m.problemIds.includes(problemId));
          const updatedCProblems = stillUsed 
            ? (c.problemIds || []) 
            : (c.problemIds || []).filter(id => id !== problemId);

          return { ...c, problemIds: updatedCProblems, modules: updatedMods };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  addSlideToModule: (courseId, moduleId, slide) => {
    const newSlide = {
      ...slide,
      id: 's-' + Math.random().toString(36).substring(2, 7),
      uploadedAt: new Date().toISOString()
    };
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          // Add to global slides list
          const cSlides = c.slides || [];
          const updatedCSlides = [...cSlides, newSlide];

          // Add to module slides list
          const currentMods = c.modules || [];
          const updatedMods = currentMods.map((m) => {
            if (m.id === moduleId) {
              const mSlides = m.slideIds || [];
              return { ...m, slideIds: [...mSlides, newSlide.id] };
            }
            return m;
          });

          return { ...c, slides: updatedCSlides, modules: updatedMods };
        }
        return c;
      })
    }));
    get().syncToStorage();
    return newSlide;
  },

  removeSlideFromModule: (courseId, moduleId, slideId) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          // Remove from global slides list
          const updatedCSlides = (c.slides || []).filter(s => s.id !== slideId);

          // Remove from module
          const currentMods = c.modules || [];
          const updatedMods = currentMods.map((m) => {
            if (m.id === moduleId) {
              return {
                ...m,
                slideIds: (m.slideIds || []).filter(id => id !== slideId)
              };
            }
            return m;
          });

          return { ...c, slides: updatedCSlides, modules: updatedMods };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  updateSlideInModule: (courseId, moduleId, slideId, slideData) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          const currentSlides = c.slides || [];
          return {
            ...c,
            slides: currentSlides.map((s) => s.id === slideId ? { ...s, ...slideData } : s)
          };
        }
        return c;
      })
    }));
    get().syncToStorage();
  },

  assignAssessmentToModule: (courseId, moduleId, assessmentId) => {
    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === courseId) {
          // Ensure assessment is in course list
          const cAssessments = c.assessments || [];
          const updatedCAssessments = cAssessments.includes(assessmentId) ? cAssessments : [...cAssessments, assessmentId];

          // Link to this module, and remove from any other modules in this course
          const currentMods = c.modules || [];
          const updatedMods = currentMods.map((m) => {
            const currentAIds = m.assessmentIds || [];
            if (m.id === moduleId) {
              return {
                ...m,
                assessmentIds: currentAIds.includes(assessmentId) ? currentAIds : [...currentAIds, assessmentId]
              };
            } else {
              return {
                ...m,
                assessmentIds: currentAIds.filter(id => id !== assessmentId)
              };
            }
          });

          return { ...c, assessments: updatedCAssessments, modules: updatedMods };
        }
        return c;
      })
    }));
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
