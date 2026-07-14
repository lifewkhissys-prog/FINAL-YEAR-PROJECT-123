import { create } from 'zustand';
import * as coursesApi from '../api/courses.api';
import * as assessmentsApi from '../api/assessments.api';
import * as problemsApi from '../api/problems.api';
import * as submissionsApi from '../api/submissions.api';
import * as dashboardApi from '../api/dashboard.api';

// Helper to load/save modules and slides from localStorage so they persist
const getLocalData = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
};

const saveLocalData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // Ignore
  }
};

const mapCourse = (c) => {
  // Load slides and modules from localStorage scoped by course ID
  const slides = getLocalData(`course_${c.id}_slides`, []);
  const modules = getLocalData(`course_${c.id}_modules`, [
    {
      id: `m-general-${c.id}`,
      title: 'General Resources',
      description: 'Course lectures and practice problems.',
      slideIds: [],
      problemIds: [],
      assessmentIds: []
    }
  ]);

  return {
    id: String(c.id),
    title: c.title,
    language: c.language,
    description: c.description,
    lecturer: c.lecturerName || 'Lecturer',
    lecturerName: c.lecturerName || 'Lecturer',
    joinCode: c.joinCode,
    studentCount: c.studentCount || 0,
    assessmentCount: c.assessmentCount || 0,
    students: [], // Filled dynamically if needed
    assessments: [], // Filled dynamically
    problemIds: [], // Filled dynamically
    slides,
    modules
  };
};

const mapAssessment = (a) => ({
  id: String(a.id),
  courseId: String(a.courseId),
  courseName: a.courseName,
  title: a.title,
  startsAt: a.startsAt,
  endsAt: a.endsAt,
  durationSecs: a.durationSecs,
  status: a.status, // "scheduled" | "active" | "ended"
  problemIds: a.problems ? a.problems.map(p => String(p.id)) : [],
  problems: a.problems ? a.problems.map(p => String(p.id)) : []
});

const mapProblem = (p) => {
  let content = {};
  if (typeof p.content === 'string') {
    try {
      content = JSON.parse(p.content);
    } catch (e) {}
  } else if (p.content) {
    content = p.content;
  }

  return {
    id: String(p.id),
    assessmentId: String(p.assessmentId),
    title: p.title,
    type: p.type, // challenge, guided, mcq, short_answer
    language: p.language,
    description: content.description || '',
    starterCode: content.starterCode || '',
    testCases: p.testCases ? p.testCases.map(tc => ({
      id: String(tc.id),
      stdin: tc.stdin,
      expectedStdout: tc.expectedStdout,
      isHidden: tc.isHidden,
      position: tc.position
    })) : [],
    // Guided, MCQ, short_answer support:
    choices: content.choices || [],
    explanation: content.explanation || '',
    points: content.points || 0,
    steps: content.steps || [],
    blocks: content.blocks || []
  };
};

const mapSubmission = (s) => ({
  id: String(s.id),
  problemId: String(s.problemId),
  problemTitle: s.problemTitle || 'Coding Practice',
  courseId: s.courseId ? String(s.courseId) : '',
  courseName: s.courseName || '',
  language: s.language,
  score: s.score || 0,
  totalCases: s.totalCases || 0,
  status: s.status, // completed, error, pending
  isGraded: s.isGraded || false,
  submittedAt: s.submittedAt,
  code: s.code || ''
});

export const useDemoStore = create((set, get) => ({
  courses: [],
  problems: {}, // Keep object dictionary mapping as expected by pages
  assessments: [],
  submissions: [],
  studentsList: [],
  loading: false,
  error: null,

  // Synchronise mock helper (no-op since we write to database)
  syncToStorage: () => {},

  // Global Initializer
  initializeData: async (userRole) => {
    set({ loading: true });
    try {
      // 1. Fetch courses
      const coursesRes = await coursesApi.getCourses();
      const mappedCourses = coursesRes.data.map(mapCourse);
      
      const allAssessments = [];
      const allProblemsList = [];
      const allSubmissions = [];
      const enrolledStudentsMap = {};

      // 2. Fetch assessments and students for each course
      for (const c of mappedCourses) {
        // Fetch course assessments
        try {
          const assRes = await assessmentsApi.getCourseAssessments(c.id);
          const mappedAss = assRes.data.map(mapAssessment);
          allAssessments.push(...mappedAss);
          c.assessments = mappedAss.map(a => a.id);
        } catch (e) {
          console.error(`Failed to fetch assessments for course ${c.id}:`, e);
        }

        // Fetch course students if lecturer
        if (userRole === 'lecturer') {
          try {
            const studRes = await coursesApi.getCourseStudents(c.id);
            c.students = studRes.data.map(s => s.email);
            for (const s of studRes.data) {
              enrolledStudentsMap[s.email] = {
                id: String(s.user_id),
                name: s.name,
                email: s.email
              };
            }
          } catch (e) {
            console.error(`Failed to fetch students for course ${c.id}:`, e);
          }
        }
      }

      // 3. Fetch all problems (lecturer global list or from assessments)
      if (userRole === 'lecturer') {
        try {
          const probRes = await problemsApi.getProblems();
          allProblemsList.push(...probRes.data.map(mapProblem));
        } catch (e) {
          console.error("Failed to fetch lecturer problems:", e);
        }
      } else {
        // Student: fetch practice problems for each course
        for (const c of mappedCourses) {
          try {
            const probRes = await problemsApi.getProblems({ courseId: c.id, practice: true });
            allProblemsList.push(...probRes.data.map(mapProblem));
          } catch (e) {}
        }
      }

      // Ensure problem IDs are linked to courses and assessments in frontend layout
      const problemsDict = {};
      allProblemsList.forEach(p => {
        problemsDict[p.id] = p;
        
        // Link to course
        const ass = allAssessments.find(a => a.id === p.assessmentId);
        if (ass) {
          const course = mappedCourses.find(c => c.id === ass.courseId);
          if (course && !course.problemIds.includes(p.id)) {
            course.problemIds.push(p.id);
            // Also link to module general
            const genMod = course.modules.find(m => m.id === `m-general-${course.id}`);
            if (genMod && !genMod.problemIds.includes(p.id)) {
              genMod.problemIds.push(p.id);
            }
          }
        }
      });

      // 4. Fetch submissions
      if (userRole === 'student') {
        try {
          const subRes = await dashboardApi.getStudentSubmissionsList();
          allSubmissions.push(...subRes.data.map(mapSubmission));
        } catch (e) {
          console.error("Failed to fetch student submissions:", e);
        }
      } else {
        // Lecturer: fetch submissions for each student
        const studentEmails = Object.keys(enrolledStudentsMap);
        for (const email of studentEmails) {
          const student = enrolledStudentsMap[email];
          for (const c of mappedCourses) {
            try {
              const subRes = await dashboardApi.getCourseStudentSubmissions(c.id, student.id);
              allSubmissions.push(...subRes.data.map(mapSubmission));
            } catch (e) {}
          }
        }
      }

      set({
        courses: mappedCourses,
        assessments: allAssessments,
        problems: problemsDict,
        submissions: allSubmissions,
        studentsList: Object.values(enrolledStudentsMap),
        loading: false
      });
    } catch (e) {
      console.error("Failed to initialize store data:", e);
      set({ error: e, loading: false });
    }
  },

  // Courses Actions
  createCourse: async (courseData) => {
    try {
      const res = await coursesApi.createCourse({
        title: courseData.title,
        language: courseData.language,
        description: courseData.description
      });
      const newCourse = mapCourse(res.data);
      set((state) => ({ courses: [...state.courses, newCourse] }));
      return newCourse;
    } catch (e) {
      console.error("Create course failed:", e);
      throw e;
    }
  },

  updateCourse: async (courseId, courseData) => {
    try {
      const res = await coursesApi.updateCourse(courseId, {
        title: courseData.title,
        language: courseData.language,
        description: courseData.description
      });
      set((state) => ({
        courses: state.courses.map((c) => (c.id === String(courseId) ? mapCourse(res.data) : c))
      }));
    } catch (e) {
      console.error("Update course failed:", e);
      throw e;
    }
  },

  deleteCourse: async (courseId) => {
    try {
      await coursesApi.deleteCourse(courseId);
      set((state) => ({
        courses: state.courses.filter((c) => c.id !== String(courseId)),
        assessments: state.assessments.filter((a) => a.courseId !== String(courseId))
      }));
    } catch (e) {
      console.error("Delete course failed:", e);
      throw e;
    }
  },

  enrollStudent: async (courseId, email) => {
    try {
      const res = await coursesApi.enrollInCourse(courseId, { email }); // Lecturer adds student
      const userObj = {
        id: String(res.data.user_id),
        name: res.data.name,
        email: res.data.email
      };
      set((state) => ({
        studentsList: state.studentsList.some(s => s.email === email) ? state.studentsList : [...state.studentsList, userObj],
        courses: state.courses.map((c) => {
          if (c.id === String(courseId)) {
            const list = c.students || [];
            return { ...c, students: list.includes(email) ? list : [...list, email] };
          }
          return c;
        })
      }));
    } catch (e) {
      console.error("Enroll student failed:", e);
      throw e;
    }
  },

  enrollStudentWithCode: async (joinCode, email) => {
    try {
      const res = await coursesApi.enrollInCourseByCode(joinCode); // Student self-enrolls
      const userObj = {
        id: String(res.data.user_id),
        name: res.data.name,
        email: res.data.email
      };
      
      // Load courses to fetch the newly joined course
      const coursesRes = await coursesApi.getCourses();
      const mappedCourses = coursesRes.data.map(mapCourse);
      
      set({ courses: mappedCourses });
      
      const newlyJoined = mappedCourses.find(c => String(c.id) === String(res.data.course_id));
      return newlyJoined;
    } catch (e) {
      console.error("Join course failed:", e);
      throw e;
    }
  },

  unenrollStudent: async (courseId, email) => {
    try {
      const state = get();
      const student = state.studentsList.find(s => s.email === email);
      if (student) {
        await coursesApi.removeStudent(courseId, student.id);
        set((state) => ({
          courses: state.courses.map((c) => {
            if (c.id === String(courseId)) {
              return { ...c, students: (c.students || []).filter(e => e !== email) };
            }
            return c;
          })
        }));
      }
    } catch (e) {
      console.error("Unenroll student failed:", e);
    }
  },

  removeStudent: async (courseId, email) => {
    await get().unenrollStudent(courseId, email);
  },

  // Assessments Actions
  createAssessment: async (assessmentData) => {
    try {
      const res = await assessmentsApi.createAssessment({
        courseId: Number(assessmentData.courseId),
        title: assessmentData.title,
        startsAt: assessmentData.startsAt,
        endsAt: assessmentData.endsAt
      });
      const newAss = mapAssessment(res.data);
      set((state) => ({
        assessments: [...state.assessments, newAss],
        courses: state.courses.map((c) => {
          if (c.id === newAss.courseId) {
            const list = c.assessments || [];
            return { ...c, assessments: [...list, newAss.id] };
          }
          return c;
        })
      }));
      return newAss;
    } catch (e) {
      console.error("Create assessment failed:", e);
      throw e;
    }
  },

  updateAssessment: async (assessmentId, assessmentData) => {
    try {
      const res = await assessmentsApi.updateAssessment(assessmentId, {
        title: assessmentData.title,
        startsAt: assessmentData.startsAt,
        endsAt: assessmentData.endsAt
      });
      const updated = mapAssessment(res.data);
      set((state) => ({
        assessments: state.assessments.map((a) => (a.id === String(assessmentId) ? updated : a))
      }));
    } catch (e) {
      console.error("Update assessment failed:", e);
      throw e;
    }
  },

  deleteAssessment: async (assessmentId) => {
    try {
      await assessmentsApi.deleteAssessment(assessmentId);
      const assessment = get().assessments.find((a) => a.id === String(assessmentId));
      if (!assessment) return;

      set((state) => ({
        assessments: state.assessments.filter((a) => a.id !== String(assessmentId)),
        courses: state.courses.map((c) => {
          if (c.id === assessment.courseId) {
            return { ...c, assessments: (c.assessments || []).filter((aId) => aId !== String(assessmentId)) };
          }
          return c;
        })
      }));
    } catch (e) {
      console.error("Delete assessment failed:", e);
      throw e;
    }
  },

  // Problems Actions
  saveProblem: async (problemData) => {
    try {
      let res;
      const isNew = !problemData.id;
      
      const payload = {
        assessmentId: Number(problemData.assessmentId),
        title: problemData.title,
        type: problemData.type,
        language: problemData.language,
        content: {
          description: problemData.description || '',
          starterCode: problemData.starterCode || '',
          choices: problemData.choices || [],
          explanation: problemData.explanation || '',
          points: Number(problemData.points || 0),
          steps: problemData.steps || [],
          blocks: problemData.blocks || []
        },
        timeLimitMs: Number(problemData.timeLimitMs || 2000),
        memoryLimitMb: Number(problemData.memoryLimitMb || 256)
      };

      if (isNew) {
        res = await problemsApi.createProblem(payload);
      } else {
        res = await problemsApi.updateProblem(problemData.id, payload);
      }

      const problemId = String(res.data.id);
      
      // Save test cases if provided
      if (problemData.testCases && problemData.testCases.length > 0) {
        const testCasesPayload = problemData.testCases.map((tc, idx) => ({
          stdin: tc.stdin || '',
          expectedStdout: tc.expectedStdout || '',
          isHidden: tc.isHidden || false,
          position: idx
        }));
        await problemsApi.addTestCase(problemId, testCasesPayload);
      }

      // Fetch final detailed problem
      const detailRes = await problemsApi.getProblem(problemId);
      const updated = mapProblem(detailRes.data);

      set((state) => ({
        problems: {
          ...state.problems,
          [problemId]: updated
        }
      }));

      // Refresh store to ensure all list links are up to date
      const activeUser = useAuthStore.getState().user;
      if (activeUser) {
        await get().initializeData(activeUser.role);
      }

      return updated;
    } catch (e) {
      console.error("Save problem failed:", e);
      throw e;
    }
  },

  deleteProblem: async (problemId) => {
    try {
      await problemsApi.deleteProblem(problemId);
      set((state) => {
        const nextProblems = { ...state.problems };
        delete nextProblems[problemId];

        return {
          problems: nextProblems,
          assessments: state.assessments.map((a) => ({
            ...a,
            problemIds: (a.problemIds || []).filter((id) => id !== String(problemId)),
            problems: (a.problems || []).filter((id) => id !== String(problemId))
          })),
          courses: state.courses.map((c) => ({
            ...c,
            problemIds: (c.problemIds || []).filter((id) => id !== String(problemId))
          }))
        };
      });
    } catch (e) {
      console.error("Delete problem failed:", e);
      throw e;
    }
  },

  linkProblemsToAssessment: async (assessmentId, problemIds) => {
    // Backend links problems directly via assessment_id inside the problem table, so this is handled during problem creation/update.
  },

  unlinkProblemFromAssessment: async (assessmentId, problemId) => {
    // Delete problem on backend to unlink it
    await get().deleteProblem(problemId);
  },

  linkProblemsToCourse: async (courseId, problemIds) => {},
  unlinkProblemFromCourse: async (courseId, problemId) => {},

  // Local-only persistence for slides and modules
  addSlideToCourse: (courseId, slide) => {
    const key = `course_${courseId}_slides`;
    const current = getLocalData(key, []);
    const newSlide = {
      ...slide,
      id: 's-' + Math.random().toString(36).substring(2, 7),
      uploadedAt: new Date().toISOString()
    };
    const updated = [...current, newSlide];
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, slides: updated };
        }
        return c;
      })
    }));
    return newSlide;
  },

  removeSlideFromCourse: (courseId, slideId) => {
    const key = `course_${courseId}_slides`;
    const current = getLocalData(key, []);
    const updated = current.filter(s => s.id !== slideId);
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, slides: updated };
        }
        return c;
      })
    }));
  },

  updateSlideInCourse: (courseId, slideId, slideData) => {
    const key = `course_${courseId}_slides`;
    const current = getLocalData(key, []);
    const updated = current.map(s => s.id === slideId ? { ...s, ...slideData } : s);
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, slides: updated };
        }
        return c;
      })
    }));
  },

  createModule: (courseId, moduleData) => {
    const key = `course_${courseId}_modules`;
    const current = getLocalData(key, []);
    const newModule = {
      id: 'm-' + Math.random().toString(36).substring(2, 7),
      title: moduleData.title,
      description: moduleData.description || '',
      slideIds: [],
      problemIds: [],
      assessmentIds: []
    };
    const updated = [...current, newModule];
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, modules: updated };
        }
        return c;
      })
    }));
    return newModule;
  },

  updateModule: (courseId, moduleId, moduleData) => {
    const key = `course_${courseId}_modules`;
    const current = getLocalData(key, []);
    const updated = current.map(m => m.id === moduleId ? { ...m, ...moduleData } : m);
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, modules: updated };
        }
        return c;
      })
    }));
  },

  deleteModule: (courseId, moduleId) => {
    const key = `course_${courseId}_modules`;
    const current = getLocalData(key, []);
    const updated = current.filter(m => m.id !== moduleId);
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, modules: updated };
        }
        return c;
      })
    }));
  },

  linkProblemToModule: (courseId, moduleId, problemId) => {
    const key = `course_${courseId}_modules`;
    const current = getLocalData(key, []);
    const updated = current.map(m => {
      if (m.id === moduleId) {
        const pList = m.problemIds || [];
        return { ...m, problemIds: pList.includes(problemId) ? pList : [...pList, problemId] };
      }
      return m;
    });
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, modules: updated };
        }
        return c;
      })
    }));
  },

  unlinkProblemFromModule: (courseId, moduleId, problemId) => {
    const key = `course_${courseId}_modules`;
    const current = getLocalData(key, []);
    const updated = current.map(m => {
      if (m.id === moduleId) {
        return { ...m, problemIds: (m.problemIds || []).filter(id => id !== problemId) };
      }
      return m;
    });
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, modules: updated };
        }
        return c;
      })
    }));
  },

  addSlideToModule: (courseId, moduleId, slide) => {
    const newSlide = get().addSlideToCourse(courseId, slide);
    const key = `course_${courseId}_modules`;
    const current = getLocalData(key, []);
    const updated = current.map(m => {
      if (m.id === moduleId) {
        const sList = m.slideIds || [];
        return { ...m, slideIds: [...sList, newSlide.id] };
      }
      return m;
    });
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, modules: updated };
        }
        return c;
      })
    }));
    return newSlide;
  },

  removeSlideFromModule: (courseId, moduleId, slideId) => {
    get().removeSlideFromCourse(courseId, slideId);
    const key = `course_${courseId}_modules`;
    const current = getLocalData(key, []);
    const updated = current.map(m => {
      if (m.id === moduleId) {
        return { ...m, slideIds: (m.slideIds || []).filter(id => id !== slideId) };
      }
      return m;
    });
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, modules: updated };
        }
        return c;
      })
    }));
  },

  updateSlideInModule: (courseId, moduleId, slideId, slideData) => {
    get().updateSlideInCourse(courseId, slideId, slideData);
  },

  assignAssessmentToModule: (courseId, moduleId, assessmentId) => {
    const key = `course_${courseId}_modules`;
    const current = getLocalData(key, []);
    const updated = current.map(m => {
      const aList = m.assessmentIds || [];
      if (m.id === moduleId) {
        return { ...m, assessmentIds: aList.includes(assessmentId) ? aList : [...aList, assessmentId] };
      } else {
        return { ...m, assessmentIds: aList.filter(id => id !== assessmentId) };
      }
    });
    saveLocalData(key, updated);

    set((state) => ({
      courses: state.courses.map((c) => {
        if (c.id === String(courseId)) {
          return { ...c, modules: updated };
        }
        return c;
      })
    }));
  },

  // Submissions Actions
  addSubmission: async (submissionData) => {
    try {
      const res = await submissionsApi.createSubmission({
        problem_id: Number(submissionData.problemId),
        code: submissionData.code,
        language: submissionData.language
      });
      
      const newSub = mapSubmission(res.data);
      set((state) => ({
        submissions: [newSub, ...state.submissions]
      }));

      // Refresh store to get latest stats
      const activeUser = useAuthStore.getState().user;
      if (activeUser) {
        await get().initializeData(activeUser.role);
      }

      return newSub;
    } catch (e) {
      console.error("Submit code failed:", e);
      throw e;
    }
  }
}));
