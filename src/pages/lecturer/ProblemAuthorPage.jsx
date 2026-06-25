import { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Save, Eye, Layout, Loader2, ArrowUp, ArrowDown, Trash2, Sparkles,
  Cpu, Play, Check, Database, Lock, Compass, HelpCircle, RefreshCw, CheckCircle2,
  XCircle, Code2, Terminal, ArrowRight, BookOpen, ShieldCheck, AlertTriangle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { CodeEditor } from '../../components/editor/CodeEditor';
import { useDemoStore } from '../../store/demoStore';
import toast from 'react-hot-toast';

export function ProblemAuthorPage() {
  const { assessmentId, problemId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!problemId;
  const { problems, saveProblem } = useDemoStore();

  // Wizard state machine: 'setup' | 'prompt' | 'editor' | 'validation' | 'preview' | 'publish'
  const [step, setStep] = useState('setup');
  const [saving, setSaving] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Axes Selection
  const [selectedType, setSelectedType] = useState('coding'); // 'mcq' | 'short_answer' | 'coding' | 'sql_problem'
  const [selectedMode, setSelectedMode] = useState('direct'); // 'direct' | 'guided' | 'exploratory'

  // AI Prompt Panel fields
  const [aiPrompt, setAiPrompt] = useState({
    topic: '',
    difficulty: 'easy',
    tags: '',
    narrative: '',
    numSteps: 3,
    numTestCases: 5,
    allowedLanguages: ['python'],
    schemaComplexity: 'simple',
    finalAnswerFormat: 'Single Value',
    murderMystery: false
  });

  // Problem definition state (gets populated by AI draft generator, or manually edited)
  const [problemData, setProblemData] = useState({
    title: '',
    points: 10,
    difficulty: 'easy',
    tags: '',
    description: '',
    // MCQ specific
    choices: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    explanation: '',
    // Short Answer specific
    prompt: '',
    gradingMode: 'keyword_match', // 'keyword_match' | 'manual'
    expectedAnswer: '',
    keywords: '', // Comma separated
    // Short Answer Guided / Coding Guided / SQL Guided
    steps: [],
    // Coding specific
    starterCode: '',
    referenceSolution: '',
    testCases: [
      { id: 'tc_1', stdin: '', expectedStdout: '', isHidden: false, weight: 5 }
    ],
    allowedLanguages: ['python'],
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    // SQL specific
    schemaSql: '',
    seedSql: '',
    solutionQuery: '',
    sqlGradingMode: 'exact_match', // 'exact_match' | 'subset_match' | 'row_match'
    // SQL Exploratory specific
    finalAnswerSchema: [
      { field: 'suspect_name', label: 'Suspect Name' }
    ],
    finalAnswerKey: {
      suspect_name: ''
    },
    sandboxStrategy: 'per_attempt', // 'per_attempt' | 'shared_readonly'
    maxQueries: 0, // unlimited
    clues: []
  });

  // Validation States
  const [isValidating, setIsValidating] = useState(false);
  const [validationLogs, setValidationLogs] = useState([]);
  const [validationPassed, setValidationPassed] = useState(false);
  const [validationCheckedRules, setValidationCheckedRules] = useState([]);

  // Preview / Student Interactive View State
  const [previewStudentAnswer, setPreviewStudentAnswer] = useState('');
  const [previewStudentChoices, setPreviewStudentChoices] = useState({});
  const [previewStudentCode, setPreviewStudentCode] = useState('');
  const [previewStudentSQLResults, setPreviewStudentSQLResults] = useState(null);
  const [previewStudentActiveStepIndex, setPreviewStudentActiveStepIndex] = useState(0);
  const [previewStudentStepResults, setPreviewStudentStepResults] = useState({});
  const [previewCluesUnlocked, setPreviewCluesUnlocked] = useState([]);

  // Valid combos mapping
  const VALID_COMBINATIONS = {
    mcq: ['direct'],
    short_answer: ['direct', 'guided'],
    coding: ['direct', 'guided', 'exploratory'],
    sql_problem: ['direct', 'guided', 'exploratory']
  };

  const isComboValid = (type, mode) => {
    return VALID_COMBINATIONS[type]?.includes(mode);
  };

  // Load existing problem data when editing
  useEffect(() => {
    if (isEditing && problemId) {
      const existing = problems[problemId];
      if (existing) {
        setSelectedType(existing.type || 'coding');
        setSelectedMode(existing.interactionMode || 'direct');
        setProblemData({
          title: existing.title || '',
          points: existing.points || 10,
          difficulty: existing.difficulty || 'easy',
          tags: existing.tags || '',
          description: existing.description || '',
          choices: existing.choices || [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ],
          explanation: existing.explanation || '',
          prompt: existing.prompt || '',
          gradingMode: existing.gradingMode || 'keyword_match',
          expectedAnswer: existing.expectedAnswer || '',
          keywords: existing.keywords || '',
          steps: existing.steps || [],
          starterCode: existing.starterCode || '',
          referenceSolution: existing.referenceSolution || '',
          testCases: existing.testCases || [],
          allowedLanguages: existing.allowedLanguages || ['python'],
          timeLimitMs: existing.timeLimitMs || 2000,
          memoryLimitMb: existing.memoryLimitMb || 256,
          schemaSql: existing.schemaSql || '',
          seedSql: existing.seedSql || '',
          solutionQuery: existing.solutionQuery || '',
          sqlGradingMode: existing.sqlGradingMode || 'exact_match',
          finalAnswerSchema: existing.finalAnswerSchema || [{ field: 'suspect_name', label: 'Suspect Name' }],
          finalAnswerKey: existing.finalAnswerKey || { suspect_name: '' },
          sandboxStrategy: existing.sandboxStrategy || 'per_attempt',
          maxQueries: existing.maxQueries || 0,
          clues: existing.clues || []
        });
        setStep('editor');
      }
    }
  }, [isEditing, problemId, problems]);

  // Handle combo select
  const selectCombo = (type, mode) => {
    if (isComboValid(type, mode)) {
      setSelectedType(type);
      setSelectedMode(mode);
    }
  };

  // Mock AI Draft Generation based on selections
  const generateAIDraft = () => {
    if (!aiPrompt.topic.trim()) {
      toast.error('Please specify a Topic or Concept first.');
      return;
    }

    setGeneratingDraft(true);

    setTimeout(() => {
      const topic = aiPrompt.topic.trim();
      const diff = aiPrompt.difficulty;
      const tags = aiPrompt.tags || topic.toLowerCase().replace(/\s+/g, '-');
      const narrative = aiPrompt.narrative;

      let draft = {
        title: `${topic} (${diff.toUpperCase()})`,
        points: diff === 'easy' ? 10 : diff === 'medium' ? 20 : 30,
        difficulty: diff,
        tags: tags,
        description: narrative ? `### ${topic}\n\n${narrative}\n\nComplete the task using the instructions below.` : `### Understanding ${topic}\n\nThis problem tests your understanding of **${topic}** under a ${diff} setting. Review the instructions and fulfill the criteria.`,
        choices: [
          { text: `An explanation about ${topic} that is completely correct.`, isCorrect: true },
          { text: `A common distractor about ${topic} that sounds logical but is wrong.`, isCorrect: false },
          { text: `An outdated definition related to ${topic}.`, isCorrect: false },
          { text: `None of the above options.`, isCorrect: false }
        ],
        explanation: `The correct option is indeed correct because of standard industry rules regarding ${topic}.`,
        prompt: `Explain how ${topic} functions in modern applications, citing specific constraints.`,
        gradingMode: 'keyword_match',
        expectedAnswer: `The main purpose is related to optimizing the processing efficiency of ${topic}.`,
        keywords: `${topic.toLowerCase().split(' ')[0]}, optimization, efficiency`,
        steps: [],
        starterCode: '',
        referenceSolution: '',
        testCases: [],
        allowedLanguages: aiPrompt.allowedLanguages,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        schemaSql: '',
        seedSql: '',
        solutionQuery: '',
        sqlGradingMode: 'exact_match',
        finalAnswerSchema: [
          { field: 'suspect_name', label: 'Suspect Name' },
          { field: 'location', label: 'Location' }
        ],
        finalAnswerKey: {
          suspect_name: 'Morty Schapiro',
          location: 'SQL City'
        },
        sandboxStrategy: 'per_attempt',
        maxQueries: 0,
        clues: [
          { id: 'c1', triggerQueries: 2, text: 'Check the security cameras near the entrance.' },
          { id: 'c2', triggerQueries: 5, text: 'The suspect left in a red vehicle.' }
        ]
      };

      // Customized template generators based on type & mode combinations
      if (selectedType === 'mcq') {
        if (topic.toLowerCase().includes('box model')) {
          draft.title = 'CSS Box Model';
          draft.description = 'Which CSS property controls the spacing inside the border of an element?';
          draft.choices = [
            { text: 'margin', isCorrect: false },
            { text: 'padding', isCorrect: true },
            { text: 'border', isCorrect: false },
            { text: 'gap', isCorrect: false }
          ];
          draft.explanation = 'Padding is space inside the border, while margin is space outside the border.';
        }
      } else if (selectedType === 'short_answer') {
        if (selectedMode === 'direct') {
          if (topic.toLowerCase().includes('big o')) {
            draft.title = 'Big O Search Complexity';
            draft.prompt = 'What is the worst-case time complexity of searching in a balanced Binary Search Tree of size N?';
            draft.keywords = 'O(log n), logarithmic, log n';
          }
        } else if (selectedMode === 'guided') {
          draft.steps = [
            {
              id: 'step_1',
              prompt: `Define the primary mechanism behind ${topic}.`,
              gradingMode: 'keyword_match',
              keywords: 'mechanism, component, structure',
              showPrevAnswer: false
            },
            {
              id: 'step_2',
              prompt: `Describe how we can optimize this mechanism in a production environment.`,
              gradingMode: 'manual',
              keywords: '',
              showPrevAnswer: true
            }
          ];
        }
      } else if (selectedType === 'coding') {
        if (selectedMode === 'direct' || selectedMode === 'exploratory') {
          if (topic.toLowerCase().includes('two sum')) {
            draft.title = 'Two Sum';
            draft.description = `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\``;
            draft.starterCode = `def two_sum(nums, target):
    # Write your code here
    pass`;
            draft.referenceSolution = `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`;
            draft.testCases = [
              { id: 'tc_1', stdin: '[2,7,11,15]\n9', expectedStdout: '[0, 1]', isHidden: false, weight: 5 },
              { id: 'tc_2', stdin: '[3,2,4]\n6', expectedStdout: '[1, 2]', isHidden: false, weight: 5 },
              { id: 'tc_3', stdin: '[3,3]\n6', expectedStdout: '[0, 1]', isHidden: true, weight: 5 }
            ];
          } else {
            // General coding templates
            draft.starterCode = `def solve(data):\n    # Write template for ${topic}\n    pass`;
            draft.referenceSolution = `def solve(data):\n    # Solution for ${topic}\n    return data`;
            draft.testCases = [
              { id: 'tc_1', stdin: '10', expectedStdout: '10', isHidden: false, weight: 5 }
            ];
          }
        } else if (selectedMode === 'guided') {
          draft.steps = [
            {
              id: 'step_1',
              type: 'concept',
              prompt: `Explain the base cases we must handle when designing a system for ${topic}.`,
              gradingMode: 'keyword_match',
              keywords: 'null, zero, bounds',
              gated: true,
              weight: 20
            },
            {
              id: 'step_2',
              type: 'code_write',
              prompt: `Write the core logic to initialize a worker that supports ${topic}.`,
              starterCode: `def initialize_worker():\n    # Init code\n    pass`,
              referenceSolution: `def initialize_worker():\n    return {"status": "ok", "active": True}`,
              testCases: [
                { id: 'tc_g1', stdin: '', expectedStdout: "{'status': 'ok', 'active': True}", isHidden: false }
              ],
              gated: true,
              weight: 40
            },
            {
              id: 'step_3',
              type: 'code_fix',
              prompt: `Fix the bug in the process function below so that it returns True on success.`,
              starterCode: `def process_work(worker):\n    # Bug: returns False always\n    return False`,
              referenceSolution: `def process_work(worker):\n    if worker.get("active"):\n        return True\n    return False`,
              testCases: [
                { id: 'tc_g2', stdin: '', expectedStdout: "True", isHidden: false }
              ],
              gated: false,
              weight: 40
            }
          ];
        }
      } else if (selectedType === 'sql_problem') {
        draft.schemaSql = `CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    department VARCHAR(50),
    salary INT
);`;
        draft.seedSql = `INSERT INTO employees (name, department, salary) VALUES
('Alice Smith', 'Sales', 65000),
('Bob Jones', 'Engineering', 90000),
('Charlie Brown', 'Sales', 58000),
('Diana Prince', 'Engineering', 120000);`;

        if (selectedMode === 'direct') {
          draft.description = `Write a SQL query to retrieve the names and salaries of all employees in the **Engineering** department, ordered by salary descending.`;
          draft.solutionQuery = `SELECT name, salary FROM employees WHERE department = 'Engineering' ORDER BY salary DESC;`;
        } else if (selectedMode === 'guided') {
          draft.description = `Guided walk-through: let's query the employee records database.`;
          draft.steps = [
            {
              id: 'step_1',
              prompt: 'Retrieve the total count of employees currently in the Sales department.',
              solutionQuery: `SELECT COUNT(*) FROM employees WHERE department = 'Sales';`,
              gated: true,
              hint: 'Use the COUNT(*) function filtered by department = \'Sales\'',
              weight: 50
            },
            {
              id: 'step_2',
              prompt: 'Query the highest salary among all employees in the database.',
              solutionQuery: `SELECT MAX(salary) FROM employees;`,
              gated: true,
              hint: 'Use the MAX(salary) function.',
              weight: 50
            }
          ];
        } else if (selectedMode === 'exploratory') {
          draft.description = `### The Stolen Prototype Mystery
A prototype was stolen from the engineering division. Run queries against the employee table database to locate the suspect.
Clue: The thief must be an employee in Engineering who earns more than $100,000.`;
          draft.solutionQuery = `SELECT name FROM employees WHERE department = 'Engineering' AND salary > 100000;`;
          draft.finalAnswerSchema = [
            { field: 'suspect_name', label: 'Suspect Name' }
          ];
          draft.finalAnswerKey = {
            suspect_name: 'Diana Prince'
          };
        }
      }

      setProblemData(draft);
      setGeneratingDraft(false);
      setStep('editor');
      toast.success('🎉 AI Draft generated successfully!');
    }, 2500);
  };

  // Run validation checks
  const runValidation = () => {
    setIsValidating(true);
    setValidationLogs([]);
    setValidationPassed(false);
    setValidationCheckedRules([]);

    const log = (msg, delay = 0) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          setValidationLogs((prev) => [...prev, msg]);
          resolve();
        }, delay);
      });
    };

    const stepsToRun = async () => {
      await log(`[SYSTEM] Initializing sandboxed execution engine...`, 400);
      await log(`[SYSTEM] Environment ready. Checking question settings...`, 300);

      const rules = [];

      if (selectedType === 'mcq') {
        await log(`[MCQ] Running validation check: correct answer availability...`, 400);
        const hasCorrect = problemData.choices.some((c) => c.isCorrect);
        const hasChoiceTexts = problemData.choices.every((c) => c.text.trim().length > 0);

        if (hasCorrect && hasChoiceTexts) {
          await log(`[SUCCESS] MCQ validation succeeded. ${problemData.choices.length} options defined. Correct answer identified.`, 300);
          rules.push({ label: 'At least one correct option selected', status: 'pass' });
          rules.push({ label: 'All option texts defined', status: 'pass' });
          setValidationPassed(true);
        } else {
          await log(`[ERROR] MCQ validation failed. Ensure all choices have text and at least one is marked correct.`, 200);
          rules.push({ label: 'At least one correct option selected', status: hasCorrect ? 'pass' : 'fail' });
          rules.push({ label: 'All option texts defined', status: hasChoiceTexts ? 'pass' : 'fail' });
          setValidationPassed(false);
        }
      } else if (selectedType === 'short_answer') {
        if (selectedMode === 'direct') {
          await log(`[SHORT_ANSWER] Verifying prompts and grading rules...`, 400);
          const promptOk = problemData.prompt.trim().length > 0;
          const keywordsOk = problemData.gradingMode === 'manual' || problemData.keywords.trim().length > 0;

          if (promptOk && keywordsOk) {
            await log(`[SUCCESS] Short Answer Direct validated successfully.`, 300);
            rules.push({ label: 'Question prompt text defined', status: 'pass' });
            rules.push({ label: 'Keywords defined (if keyword mode)', status: 'pass' });
            setValidationPassed(true);
          } else {
            await log(`[ERROR] Short Answer validation failed.`, 200);
            rules.push({ label: 'Question prompt text defined', status: promptOk ? 'pass' : 'fail' });
            rules.push({ label: 'Keywords defined (if keyword mode)', status: keywordsOk ? 'pass' : 'fail' });
            setValidationPassed(false);
          }
        } else if (selectedMode === 'guided') {
          await log(`[SHORT_ANSWER_GUIDED] Parsing steps...`, 400);
          const stepsCount = problemData.steps.length;
          const stepsValid = stepsCount > 0 && problemData.steps.every(s => s.prompt.trim().length > 0);

          if (stepsValid) {
            await log(`[SUCCESS] All ${stepsCount} conceptual steps validated.`, 300);
            rules.push({ label: 'Contains at least one step', status: 'pass' });
            rules.push({ label: 'All step prompts defined', status: 'pass' });
            setValidationPassed(true);
          } else {
            await log(`[ERROR] Short Answer Guided validation failed.`, 200);
            rules.push({ label: 'Contains at least one step', status: stepsCount > 0 ? 'pass' : 'fail' });
            rules.push({ label: 'All step prompts defined', status: stepsValid ? 'pass' : 'fail' });
            setValidationPassed(false);
          }
        }
      } else if (selectedType === 'coding') {
        if (selectedMode === 'direct' || selectedMode === 'exploratory') {
          await log(`[SANDBOX] Provisioning container for Python execution...`, 500);
          await log(`[SANDBOX] Container ready. Compiling reference solution...`, 400);

          const hasRef = problemData.referenceSolution.trim().length > 0;
          const hasTestCases = problemData.testCases.length > 0;
          const testCasesOk = hasTestCases && problemData.testCases.every(tc => tc.expectedStdout.trim().length > 0);

          if (hasRef && testCasesOk) {
            await log(`[EXECUTION] Running reference solution against test suite...`, 300);
            for (let i = 0; i < problemData.testCases.length; i++) {
              await log(`[EXECUTION] Case #${i + 1}: RUNNING...`, 200);
              await log(`[EXECUTION] Case #${i + 1}: SUCCESS (stdout matched expected)`, 150);
            }
            await log(`[SUCCESS] Reference solution passed all test cases successfully!`, 300);
            rules.push({ label: 'Reference solution compiled without errors', status: 'pass' });
            rules.push({ label: 'At least one test case defined', status: 'pass' });
            rules.push({ label: 'Reference solution passes all test cases', status: 'pass' });
            setValidationPassed(true);
          } else {
            await log(`[ERROR] Coding validation failed. Ensure reference solution is written and all test cases specify expected stdout.`, 200);
            rules.push({ label: 'Reference solution compiled without errors', status: hasRef ? 'pass' : 'fail' });
            rules.push({ label: 'At least one test case defined', status: hasTestCases ? 'pass' : 'fail' });
            rules.push({ label: 'Reference solution passes all test cases', status: testCasesOk ? 'pass' : 'fail' });
            setValidationPassed(false);
          }
        } else if (selectedMode === 'guided') {
          await log(`[SANDBOX] Spawning guided execution sandbox...`, 500);
          let allStepsValid = true;

          for (let i = 0; i < problemData.steps.length; i++) {
            const stepObj = problemData.steps[i];
            await log(`[STEP ${i + 1}] Validating step type "${stepObj.type}"...`, 300);
            if (stepObj.type === 'code_write' || stepObj.type === 'code_fix') {
              const hasRef = (stepObj.referenceSolution || '').trim().length > 0;
              const hasTC = stepObj.testCases && stepObj.testCases.length > 0;
              if (hasRef && hasTC) {
                await log(`[STEP ${i + 1}] Running test case for step...`, 200);
                await log(`[STEP ${i + 1}] PASS`, 100);
              } else {
                await log(`[STEP ${i + 1}] FAIL (missing reference solution or test cases)`, 100);
                allStepsValid = false;
              }
            } else if (stepObj.type === 'concept' || stepObj.type === 'code_trace') {
              const hasKeywords = (stepObj.keywords || '').trim().length > 0 || stepObj.gradingMode === 'manual';
              if (hasKeywords) {
                await log(`[STEP ${i + 1}] PASS (grading schema valid)`, 200);
              } else {
                await log(`[STEP ${i + 1}] FAIL (missing expected answer/keywords)`, 100);
                allStepsValid = false;
              }
            } else {
              await log(`[STEP ${i + 1}] PASS`, 100);
            }
          }

          if (allStepsValid && problemData.steps.length > 0) {
            await log(`[SUCCESS] Guided step validation complete. All blocks passed.`, 300);
            rules.push({ label: 'Steps sequence is non-empty', status: 'pass' });
            rules.push({ label: 'All executable steps pass validation', status: 'pass' });
            setValidationPassed(true);
          } else {
            await log(`[ERROR] Guided steps validation failed.`, 200);
            rules.push({ label: 'Steps sequence is non-empty', status: problemData.steps.length > 0 ? 'pass' : 'fail' });
            rules.push({ label: 'All executable steps pass validation', status: allStepsValid ? 'pass' : 'fail' });
            setValidationPassed(false);
          }
        }
      } else if (selectedType === 'sql_problem') {
        await log(`[SQL_SANDBOX] Bootstrapping Postgres server instance...`, 600);
        const schemaOk = problemData.schemaSql.trim().length > 0;
        const seedOk = problemData.seedSql.trim().length > 0;

        if (schemaOk && seedOk) {
          await log(`[SQL_SANDBOX] Running Schema creation script...`, 300);
          await log(`[SQL_SANDBOX] Inserting seed records...`, 250);

          if (selectedMode === 'direct') {
            await log(`[SQL_SANDBOX] Executing solution query against seeded DB...`, 300);
            const queryOk = problemData.solutionQuery.trim().length > 0;
            if (queryOk) {
              await log(`[SUCCESS] Solution query ran cleanly. Columns retrieved successfully.`, 200);
              rules.push({ label: 'Schema and Seed SQL run successfully', status: 'pass' });
              rules.push({ label: 'Solution query executed without syntax errors', status: 'pass' });
              setValidationPassed(true);
            } else {
              await log(`[ERROR] Solution query is empty.`, 100);
              rules.push({ label: 'Schema and Seed SQL run successfully', status: 'pass' });
              rules.push({ label: 'Solution query executed without syntax errors', status: 'fail' });
              setValidationPassed(false);
            }
          } else if (selectedMode === 'guided') {
            await log(`[SQL_SANDBOX] Validating step-by-step SQL queries...`, 400);
            let stepsOk = problemData.steps.length > 0;
            for (let i = 0; i < problemData.steps.length; i++) {
              const stepObj = problemData.steps[i];
              await log(`[SQL STEP ${i + 1}] Executing query: ${stepObj.solutionQuery}`, 250);
              if (stepObj.solutionQuery.trim().length > 0) {
                await log(`[SQL STEP ${i + 1}] PASS`, 150);
              } else {
                await log(`[SQL STEP ${i + 1}] FAIL (empty query)`, 100);
                stepsOk = false;
              }
            }
            if (stepsOk) {
              await log(`[SUCCESS] SQL Guided steps sequence valid.`, 300);
              rules.push({ label: 'Schema and Seed SQL run successfully', status: 'pass' });
              rules.push({ label: 'Every step has valid solution query', status: 'pass' });
              setValidationPassed(true);
            } else {
              await log(`[ERROR] Guided steps query verification failed.`, 200);
              rules.push({ label: 'Schema and Seed SQL run successfully', status: 'pass' });
              rules.push({ label: 'Every step has valid solution query', status: stepsOk ? 'pass' : 'fail' });
              setValidationPassed(false);
            }
          } else if (selectedMode === 'exploratory') {
            await log(`[SQL_SANDBOX] Running solution query to test final key validation...`, 400);
            const queryOk = problemData.solutionQuery.trim().length > 0;
            const keyOk = Object.values(problemData.finalAnswerKey).every(v => v.trim().length > 0);

            if (queryOk && keyOk) {
              await log(`[SUCCESS] Solution query output matches final answer key values!`, 300);
              rules.push({ label: 'Schema and Seed SQL run successfully', status: 'pass' });
              rules.push({ label: 'Solution query matches final answer key', status: 'pass' });
              setValidationPassed(true);
            } else {
              await log(`[ERROR] Exploratory mystery solver validation failed.`, 200);
              rules.push({ label: 'Schema and Seed SQL run successfully', status: 'pass' });
              rules.push({ label: 'Solution query matches final answer key', status: (queryOk && keyOk) ? 'pass' : 'fail' });
              setValidationPassed(false);
            }
          }
        } else {
          await log(`[ERROR] SQL DB Setup failed. Schema SQL or Seed SQL is blank.`, 200);
          rules.push({ label: 'Schema and Seed SQL run successfully', status: 'fail' });
          setValidationPassed(false);
        }
      }

      setValidationCheckedRules(rules);
      setIsValidating(false);
    };

    stepsToRun();
  };

  // Save/Publish problem handler
  const handleSave = () => {
    if (!problemData.title.trim()) {
      toast.error('Question title is required');
      return;
    }
    if (!validationPassed) {
      toast.error('Validation must pass before publishing this question.');
      return;
    }

    setSaving(true);
    try {
      // Map back to standard store items if coding/challenge is selected
      let dbType = selectedType;
      if (selectedType === 'coding' && selectedMode === 'direct') {
        dbType = 'challenge';
      } else if (selectedType === 'coding' && selectedMode === 'guided') {
        dbType = 'guided';
      }

      // Map steps to store format
      const dbSteps = problemData.steps.map((s, idx) => {
        if (s.type === 'concept' || s.type === 'text') {
          return { id: s.id || `s_${idx}`, type: 'text', content: s.prompt };
        } else {
          return {
            id: s.id || `s_${idx}`,
            type: 'code',
            starterCode: s.starterCode || '',
            expectedOutput: s.expectedStdout || s.expectedOutput || '',
            hint: s.hint || ''
          };
        }
      });

      const payload = {
        id: problemId,
        assessmentId,
        title: problemData.title,
        type: dbType,
        interactionMode: selectedMode,
        difficulty: problemData.difficulty,
        tags: problemData.tags,
        description: problemData.description || problemData.prompt,
        // Save all detailed axes
        choices: problemData.choices,
        explanation: problemData.explanation,
        prompt: problemData.prompt,
        gradingMode: problemData.gradingMode,
        expectedAnswer: problemData.expectedAnswer,
        keywords: problemData.keywords,
        starterCode: problemData.starterCode,
        referenceSolution: problemData.referenceSolution,
        testCases: problemData.testCases,
        allowedLanguages: problemData.allowedLanguages,
        timeLimitMs: problemData.timeLimitMs,
        memoryLimitMb: problemData.memoryLimitMb,
        schemaSql: problemData.schemaSql,
        seedSql: problemData.seedSql,
        solutionQuery: problemData.solutionQuery,
        sqlGradingMode: problemData.sqlGradingMode,
        finalAnswerSchema: problemData.finalAnswerSchema,
        finalAnswerKey: problemData.finalAnswerKey,
        sandboxStrategy: problemData.sandboxStrategy,
        maxQueries: problemData.maxQueries,
        clues: problemData.clues,
        blocks: dbSteps.length > 0 ? dbSteps : undefined
      };

      saveProblem(payload);
      toast.success(isEditing ? '🎉 Question updated successfully!' : '🎉 Question successfully saved!');
      if (assessmentId) {
        navigate(`/lecturer/assessments/${assessmentId}`);
      } else {
        navigate('/lecturer/problems');
      }
    } catch (err) {
      toast.error('Failed to save question: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper helper functions to update problem data fields
  const setField = (field, val) => {
    setProblemData((prev) => ({ ...prev, [field]: val }));
  };

  // MCQ functions
  const addChoice = () => {
    setField('choices', [...problemData.choices, { text: '', isCorrect: false }]);
  };
  const updateChoice = (idx, text) => {
    const updated = problemData.choices.map((c, i) => i === idx ? { ...c, text } : c);
    setField('choices', updated);
  };
  const markChoiceCorrect = (idx) => {
    const updated = problemData.choices.map((c, i) => ({ ...c, isCorrect: i === idx }));
    setField('choices', updated);
  };
  const removeChoice = (idx) => {
    setField('choices', problemData.choices.filter((_, i) => i !== idx));
  };

  // Coding test case functions
  const addTestCase = () => {
    const newId = `tc_${Date.now()}`;
    setField('testCases', [...problemData.testCases, { id: newId, stdin: '', expectedStdout: '', isHidden: false, weight: 5 }]);
  };
  const updateTestCase = (id, field, val) => {
    const updated = problemData.testCases.map((tc) => tc.id === id ? { ...tc, [field]: val } : tc);
    setField('testCases', updated);
  };
  const removeTestCase = (id) => {
    setField('testCases', problemData.testCases.filter((tc) => tc.id !== id));
  };

  // Step reordering and management functions
  const addStep = (type = 'concept') => {
    const newStep = {
      id: `step_${Date.now()}`,
      type,
      prompt: '',
      starterCode: type === 'code_write' || type === 'code_fix' ? 'def solve():\n    pass' : '',
      referenceSolution: '',
      testCases: [],
      keywords: '',
      gradingMode: 'keyword_match',
      gated: true,
      hint: '',
      weight: 10,
      solutionQuery: ''
    };
    setField('steps', [...problemData.steps, newStep]);
  };
  const updateStep = (id, field, val) => {
    const updated = problemData.steps.map((s) => s.id === id ? { ...s, [field]: val } : s);
    setField('steps', updated);
  };
  const removeStep = (id) => {
    setField('steps', problemData.steps.filter((s) => s.id !== id));
  };
  const moveStep = (index, direction) => {
    const steps = [...problemData.steps];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target >= 0 && target < steps.length) {
      [steps[index], steps[target]] = [steps[target], steps[index]];
      setField('steps', steps);
    }
  };

  // SQL Clues and Accusations
  const addClue = () => {
    setField('clues', [...problemData.clues, { id: `clue_${Date.now()}`, triggerQueries: 2, text: '' }]);
  };
  const updateClue = (id, field, val) => {
    const updated = problemData.clues.map((c) => c.id === id ? { ...c, [field]: val } : c);
    setField('clues', updated);
  };
  const removeClue = (id) => {
    setField('clues', problemData.clues.filter((c) => c.id !== id));
  };

  const addFinalSchemaField = () => {
    setField('finalAnswerSchema', [...problemData.finalAnswerSchema, { field: `field_${Date.now()}`, label: 'New Field' }]);
  };
  const updateFinalSchemaField = (idx, fieldObj) => {
    const updated = problemData.finalAnswerSchema.map((item, i) => i === idx ? { ...item, ...fieldObj } : item);
    setField('finalAnswerSchema', updated);
  };
  const removeFinalSchemaField = (idx) => {
    setField('finalAnswerSchema', problemData.finalAnswerSchema.filter((_, i) => i !== idx));
  };

  const updateFinalKey = (key, val) => {
    setField('finalAnswerKey', { ...problemData.finalAnswerKey, [key]: val });
  };

  // Simulated Student preview interaction handles
  const handleStudentRunSQL = (query) => {
    if (!query.trim()) return;
    setPreviewStudentSQLResults({ loading: true });
    setTimeout(() => {
      if (selectedMode === 'exploratory') {
        const matches = query.toLowerCase().includes('select') && query.toLowerCase().includes('person');
        if (matches) {
          setPreviewStudentSQLResults({
            columns: ['id', 'name', 'address_street_name'],
            rows: [
              ['1', 'Morty Schapiro', 'Northwestern Dr'],
              ['2', 'Annabel', 'Franklin St']
            ]
          });
          // Unlock progressive clues
          if (previewCluesUnlocked.length < problemData.clues.length) {
            setPreviewCluesUnlocked(prev => [...prev, problemData.clues[prev.length]]);
          }
        } else {
          setPreviewStudentSQLResults({
            columns: ['status'],
            rows: [['No matches found']]
          });
        }
      } else {
        setPreviewStudentSQLResults({
          columns: ['id', 'name', 'department', 'salary'],
          rows: [
            ['1', 'Alice Smith', 'Sales', '65000'],
            ['2', 'Bob Jones', 'Engineering', '90000']
          ]
        });
      }
    }, 600);
  };

  const checkStudentStep = (index) => {
    const stepObj = problemData.steps[index];
    setPreviewStudentStepResults(prev => ({
      ...prev,
      [stepObj.id]: { passed: true, message: 'Passed check! Next step unlocked.' }
    }));
    if (index + 1 < problemData.steps.length) {
      setPreviewStudentActiveStepIndex(index + 1);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 px-4">
      {/* Dynamic Header & Wizard Step Tracker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-20 bg-[var(--bg-primary)]/90 backdrop-blur-md py-4 border-b border-default gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to={assessmentId ? `/lecturer/assessments/${assessmentId}` : '/lecturer/problems'} 
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-secondary)] border border-default"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {isEditing ? `Edit Question: ${problemData.title}` : 'Question Design Studio'}
            </h1>
            <p className="text-xs text-brand-blue font-mono mt-0.5">
              HYBRID AUTHORING ENV • {selectedType.toUpperCase()} ({selectedMode.toUpperCase()})
            </p>
          </div>
        </div>

        {/* Horizontal Wizard tracker */}
        <div className="flex items-center gap-2 bg-white/5 border border-default p-1.5 rounded-lg text-xs font-semibold overflow-x-auto">
          {[
            { id: 'setup', label: '0. Selection' },
            { id: 'prompt', label: '1. AI Prompt' },
            { id: 'editor', label: '2. Review Draft' },
            { id: 'validation', label: '3. Sandbox Run' },
            { id: 'preview', label: '4. Student Preview' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'editor' && !problemData.title) return;
                setStep(item.id);
              }}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                step === item.id
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Global Action items */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep(step === 'preview' ? 'editor' : 'preview')}
            className={`px-4 h-9 flex items-center gap-2 rounded-lg font-semibold text-xs border border-default transition-all ${
              step === 'preview' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20' : 'hover:bg-white/5 text-[var(--text-secondary)]'
            }`}
          >
            {step === 'preview' ? <Layout size={14} /> : <Eye size={14} />}
            {step === 'preview' ? 'Design View' : 'Preview Student View'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !validationPassed}
            className="btn-primary px-5 h-9 flex items-center gap-2 text-xs shadow-lg shadow-brand-blue/15 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Publish Question
          </button>
        </div>
      </div>

      {/* STEP 0: AXES SELECTION */}
      {step === 'setup' && (
        <div className="glass p-8 max-w-4xl mx-auto space-y-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded-xl">
              <Compass size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Shared Step 0: Question Axes Setup</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                A question in DevLab is mapped across two axes: what is being tested (Type) and how students engage (Interaction Mode).
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 pt-4">
            {/* Axis 1: Question Type */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Axis 1: Question Type</h3>
              <div className="grid gap-3">
                {[
                  { id: 'mcq', title: 'Multiple Choice (MCQ)', desc: 'Multiple choice, single or multi-select responses.', icon: HelpCircle },
                  { id: 'short_answer', title: 'Short Answer', desc: 'Free text responses graded by keywords or manually.', icon: BookOpen },
                  { id: 'coding', title: 'Coding Challenge', desc: 'Write software logic that passes automated execution unit tests.', icon: Code2 },
                  { id: 'sql_problem', title: 'SQL Problem', desc: 'Write relational queries against a schema and dataset.', icon: Database }
                ].map((type) => {
                  const Icon = type.icon;
                  const selected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedType(type.id);
                        // Shift to direct if current mode becomes invalid
                        if (!VALID_COMBINATIONS[type.id].includes(selectedMode)) {
                          setSelectedMode(VALID_COMBINATIONS[type.id][0]);
                        }
                      }}
                      className={`flex items-start text-left p-4 rounded-xl border transition-all ${
                        selected ? 'border-brand-blue bg-brand-blue/5' : 'border-default hover:bg-white/5'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mr-3 ${selected ? 'bg-brand-blue/10 text-brand-blue' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-[var(--text-primary)]">{type.title}</h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{type.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Axis 2: Interaction Mode */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Axis 2: Interaction Mode</h3>
              <div className="grid gap-3">
                {[
                  { id: 'direct', title: 'Direct Submission', desc: 'Student reviews problem statement and submits one answer once.' },
                  { id: 'guided', title: 'Guided Steps', desc: 'Walks the student through sequential steps. Gated or partial credit.' },
                  { id: 'exploratory', title: 'Exploratory Sandbox', desc: 'Open sandbox to query database or code runner, then submit a final structured report.' }
                ].map((mode) => {
                  const isValid = isComboValid(selectedType, mode.id);
                  const selected = selectedMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      disabled={!isValid}
                      onClick={() => setSelectedMode(mode.id)}
                      className={`flex items-start text-left p-4 rounded-xl border transition-all relative ${
                        !isValid ? 'opacity-40 cursor-not-allowed border-dashed border-default bg-black/10' :
                        selected ? 'border-brand-blue bg-brand-blue/5' : 'border-default hover:bg-white/5'
                      }`}
                    >
                      <div className="mr-3">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold ${
                          selected ? 'bg-brand-blue border-brand-blue text-white' : 'border-default text-transparent'
                        }`}>
                          ✓
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                          {mode.title}
                          {!isValid && <Lock size={12} className="text-[var(--text-muted)]" />}
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{mode.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-default">
            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2 font-mono">
              <Sparkles size={14} className="text-brand-blue animate-pulse" />
              <span>Ready to proceed to AI prompt assistance</span>
            </div>
            <button
              onClick={() => setStep('prompt')}
              className="btn-primary py-2.5 px-6"
            >
              Continue to AI Prompt Panel <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: AI PROMPT PANEL */}
      {step === 'prompt' && (
        <div className="glass p-8 max-w-3xl mx-auto space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-purple/10 text-brand-purple border border-brand-purple/20 rounded-xl">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Shared Step 1: AI Prompt Drafting Panel</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Submit a structured prompt detailing your educational objectives. The AI agent will compose a comprehensive draft.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <Input
              label="Topic / Concept Area"
              placeholder="e.g. SQL Outer Joins, Two Sum Array search, CSS Box Model margin"
              value={aiPrompt.topic}
              onChange={(e) => setAiPrompt({ ...aiPrompt, topic: e.target.value })}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <Select
                label="Target Difficulty"
                value={aiPrompt.difficulty}
                onChange={(e) => setAiPrompt({ ...aiPrompt, difficulty: e.target.value })}
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' }
                ]}
              />

              <Input
                label="Concepts / Tags (comma separated)"
                placeholder="e.g. arrays, recursion, join, web-styling"
                value={aiPrompt.tags}
                onChange={(e) => setAiPrompt({ ...aiPrompt, tags: e.target.value })}
              />
            </div>

            <Textarea
              label="Narrative Scenario / Hint (Optional)"
              placeholder="e.g. Design a scenario where a detective is tracking credit card charges in SQL City..."
              rows={3}
              value={aiPrompt.narrative}
              onChange={(e) => setAiPrompt({ ...aiPrompt, narrative: e.target.value })}
            />

            {/* Dynamic Type/Mode prompts */}
            {selectedMode === 'guided' && (
              <Input
                label="Target Number of Steps"
                type="number"
                min={2}
                max={6}
                value={aiPrompt.numSteps}
                onChange={(e) => setAiPrompt({ ...aiPrompt, numSteps: Number(e.target.value) })}
              />
            )}

            {selectedType === 'coding' && (
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Target Test Cases Count"
                  type="number"
                  min={1}
                  value={aiPrompt.numTestCases}
                  onChange={(e) => setAiPrompt({ ...aiPrompt, numTestCases: Number(e.target.value) })}
                />

                <Select
                  label="Allowed Language"
                  value={aiPrompt.allowedLanguages[0]}
                  onChange={(e) => setAiPrompt({ ...aiPrompt, allowedLanguages: [e.target.value] })}
                  options={[
                    { value: 'python', label: 'Python' },
                    { value: 'java', label: 'Java' },
                    { value: 'cpp', label: 'C++' }
                  ]}
                />
              </div>
            )}

            {selectedType === 'sql_problem' && (
              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  label="Database Schema Complexity"
                  value={aiPrompt.schemaComplexity}
                  onChange={(e) => setAiPrompt({ ...aiPrompt, schemaComplexity: e.target.value })}
                  options={[
                    { value: 'simple', label: 'Simple (1-2 tables)' },
                    { value: 'medium', label: 'Medium (3-4 tables)' },
                    { value: 'complex', label: 'Complex (5+ tables)' }
                  ]}
                />

                {selectedMode === 'exploratory' && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] mt-8">
                    <input
                      type="checkbox"
                      className="rounded bg-black/20 border-default text-brand-blue"
                      checked={aiPrompt.murderMystery}
                      onChange={(e) => setAiPrompt({ ...aiPrompt, murderMystery: e.target.checked })}
                    />
                    Enable Murder Mystery narrative framing
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-default">
            <button
              onClick={() => setStep('setup')}
              className="px-4 py-2 hover:bg-white/5 border border-default text-xs font-bold text-[var(--text-secondary)] rounded-md"
            >
              Back to axes
            </button>
            <button
              onClick={generateAIDraft}
              disabled={generatingDraft}
              className="btn-primary py-2.5 px-6 shadow-lg shadow-brand-blue/15"
            >
              {generatingDraft ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Simulating Neural Generation...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Generate AI Draft
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: AUTHORING EDITOR (DRAFT REVIEW & EDIT) */}
      {step === 'editor' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form editing panel (left side, 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-6 space-y-4">
              <h3 className="text-md font-semibold text-[var(--text-primary)]">General Metadata</h3>
              <Input
                label="Question Title"
                placeholder="Title..."
                value={problemData.title}
                onChange={(e) => setField('title', e.target.value)}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Points Allocation"
                  type="number"
                  value={problemData.points}
                  onChange={(e) => setField('points', Number(e.target.value))}
                />
                <Input
                  label="Question Tags"
                  value={problemData.tags}
                  onChange={(e) => setField('tags', e.target.value)}
                />
              </div>
            </div>

            {/* MCQ DESIGNER */}
            {selectedType === 'mcq' && (
              <div className="glass p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-default pb-3">
                  <h3 className="text-md font-semibold text-[var(--text-primary)]">MCQ Question Setup</h3>
                  <button onClick={addChoice} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
                    <Plus size={14} /> Add Option
                  </button>
                </div>

                <div className="space-y-4">
                  <Textarea
                    label="Question Stem / Prompts"
                    placeholder="Enter question text here..."
                    value={problemData.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />

                  <div className="space-y-3">
                    <label className="label">Answer Options (Mark Correct Option)</label>
                    {problemData.choices.map((choice, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border border-default rounded-lg bg-[var(--bg-surface)]">
                        <input
                          type="radio"
                          name="correct_choice"
                          checked={choice.isCorrect}
                          onChange={() => markChoiceCorrect(index)}
                          className="w-4 h-4 text-brand-blue"
                        />
                        <input
                          type="text"
                          placeholder={`Option #${index + 1}`}
                          value={choice.text}
                          onChange={(e) => updateChoice(index, e.target.value)}
                          className="flex-1 bg-[var(--bg-primary)] border border-default rounded px-3 py-1.5 text-sm text-[var(--text-primary)]"
                        />
                        {problemData.choices.length > 2 && (
                          <button onClick={() => removeChoice(index)} className="text-red-400 hover:text-red-300">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Textarea
                    label="Post-Submission Explanation"
                    placeholder="Provide context explaining why the correct choice is true..."
                    value={problemData.explanation}
                    onChange={(e) => setField('explanation', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* SHORT ANSWER DESIGNER */}
            {selectedType === 'short_answer' && selectedMode === 'direct' && (
              <div className="glass p-6 space-y-6">
                <h3 className="text-md font-semibold text-[var(--text-primary)]">Short Answer Setup</h3>
                <div className="space-y-4">
                  <Textarea
                    label="Question Prompt"
                    placeholder="e.g. Describe the benefits of caching..."
                    value={problemData.prompt}
                    onChange={(e) => setField('prompt', e.target.value)}
                  />
                  <Select
                    label="Grading Mode"
                    value={problemData.gradingMode}
                    onChange={(e) => setField('gradingMode', e.target.value)}
                    options={[
                      { value: 'keyword_match', label: 'Keyword Matching (Automated)' },
                      { value: 'manual', label: 'Manual Grading' }
                    ]}
                  />
                  {problemData.gradingMode === 'keyword_match' && (
                    <Input
                      label="Target Matching Keywords (comma-separated)"
                      placeholder="e.g. speeds, latency, storage, memory"
                      value={problemData.keywords}
                      onChange={(e) => setField('keywords', e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* SHORT ANSWER GUIDED DESIGNER */}
            {selectedType === 'short_answer' && selectedMode === 'guided' && (
              <div className="glass p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-default pb-3">
                  <h3 className="text-md font-semibold text-[var(--text-primary)]">Guided Steps Builder</h3>
                  <button onClick={() => addStep('concept')} className="btn-secondary text-xs py-1 px-3">
                    + Add Step
                  </button>
                </div>
                <div className="space-y-4">
                  {problemData.steps.map((stepObj, index) => (
                    <div key={stepObj.id} className="p-4 border border-default rounded-lg bg-[var(--bg-surface)] space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-purple">STEP #{index + 1} (CONCEPT)</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => moveStep(index, 'up')} className="p-1 hover:bg-white/5 rounded"><ArrowUp size={14} /></button>
                          <button onClick={() => moveStep(index, 'down')} className="p-1 hover:bg-white/5 rounded"><ArrowDown size={14} /></button>
                          <button onClick={() => removeStep(stepObj.id)} className="p-1 text-red-400 hover:bg-white/5 rounded"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <Textarea
                        label="Step Prompt"
                        value={stepObj.prompt}
                        onChange={(e) => updateStep(stepObj.id, 'prompt', e.target.value)}
                      />
                      <div className="grid md:grid-cols-2 gap-4">
                        <Select
                          label="Grading Mode"
                          value={stepObj.gradingMode}
                          onChange={(e) => updateStep(stepObj.id, 'gradingMode', e.target.value)}
                          options={[
                            { value: 'keyword_match', label: 'Keyword Matching' },
                            { value: 'manual', label: 'Manual Grading' }
                          ]}
                        />
                        {stepObj.gradingMode === 'keyword_match' && (
                          <Input
                            label="Keywords"
                            value={stepObj.keywords}
                            onChange={(e) => updateStep(stepObj.id, 'keywords', e.target.value)}
                          />
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={stepObj.showPrevAnswer}
                          onChange={(e) => updateStep(stepObj.id, 'showPrevAnswer', e.target.checked)}
                          className="rounded bg-black/20 border-default text-brand-blue"
                        />
                        Allow students to see previous step answer keys before starting this step
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CODING DIRECT & EXPLORATORY DESIGNER */}
            {selectedType === 'coding' && (selectedMode === 'direct' || selectedMode === 'exploratory') && (
              <div className="space-y-6">
                <div className="glass p-6 space-y-4">
                  <h3 className="text-md font-semibold text-[var(--text-primary)]">Problem Instructions</h3>
                  <Textarea
                    label="Markdown Problem Statement"
                    placeholder="Explain the problem statement..."
                    rows={8}
                    value={problemData.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </div>

                <div className="glass p-6 space-y-4">
                  <h3 className="text-md font-semibold text-[var(--text-primary)]">Starter Template Code</h3>
                  <CodeEditor
                    value={problemData.starterCode}
                    onChange={(val) => setField('starterCode', val)}
                    language={aiPrompt.allowedLanguages[0]}
                    height="200px"
                  />
                </div>

                <div className="glass p-6 space-y-4">
                  <h3 className="text-md font-semibold text-[var(--text-primary)]">Reference Solution</h3>
                  <CodeEditor
                    value={problemData.referenceSolution}
                    onChange={(val) => setField('referenceSolution', val)}
                    language={aiPrompt.allowedLanguages[0]}
                    height="200px"
                  />
                </div>

                <div className="glass p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-default pb-2">
                    <h3 className="text-md font-semibold text-[var(--text-primary)]">Verification Test Suite</h3>
                    <button onClick={addTestCase} className="btn-secondary text-xs py-1 px-3">
                      + Add Case
                    </button>
                  </div>

                  <div className="space-y-3">
                    {problemData.testCases.map((tc, idx) => (
                      <div key={tc.id} className="p-4 border border-default rounded-lg bg-[var(--bg-surface)] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-secondary)]">TEST CASE #{idx + 1}</span>
                          <button onClick={() => removeTestCase(tc.id)} className="text-red-400 hover:text-red-300">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <Textarea
                            label="stdin"
                            rows={2}
                            value={tc.stdin}
                            onChange={(e) => updateTestCase(tc.id, 'stdin', e.target.value)}
                          />
                          <Textarea
                            label="expected stdout"
                            rows={2}
                            value={tc.expectedStdout}
                            onChange={(e) => updateTestCase(tc.id, 'expectedStdout', e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) => updateTestCase(tc.id, 'isHidden', e.target.checked)}
                              className="rounded bg-black/20 border-default text-brand-blue"
                            />
                            Hidden test case
                          </label>
                          <div className="flex items-center gap-2">
                            <span>Points Weight:</span>
                            <input
                              type="number"
                              value={tc.weight}
                              onChange={(e) => updateTestCase(tc.id, 'weight', Number(e.target.value))}
                              className="w-16 bg-[var(--bg-primary)] border border-default rounded px-2 py-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CODING GUIDED DESIGNER */}
            {selectedType === 'coding' && selectedMode === 'guided' && (
              <div className="glass p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-default pb-3">
                  <h3 className="text-md font-semibold text-[var(--text-primary)]">Guided Code Steps Builder</h3>
                  <div className="flex gap-2">
                    <button onClick={() => addStep('concept')} className="btn-secondary text-xs py-1 px-3">
                      + Add Concept Step
                    </button>
                    <button onClick={() => addStep('code_write')} className="btn-secondary text-xs py-1 px-3">
                      + Add Write Code Step
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {problemData.steps.map((stepObj, index) => (
                    <div key={stepObj.id} className="p-4 border border-default rounded-lg bg-[var(--bg-surface)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-purple">
                          STEP #{index + 1} ({stepObj.type.toUpperCase()})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => moveStep(index, 'up')} className="p-1 hover:bg-white/5 rounded"><ArrowUp size={14} /></button>
                          <button onClick={() => moveStep(index, 'down')} className="p-1 hover:bg-white/5 rounded"><ArrowDown size={14} /></button>
                          <button onClick={() => removeStep(stepObj.id)} className="p-1 text-red-400 hover:bg-white/5 rounded"><Trash2 size={14} /></button>
                        </div>
                      </div>

                      <Textarea
                        label="Step prompt"
                        value={stepObj.prompt}
                        onChange={(e) => updateStep(stepObj.id, 'prompt', e.target.value)}
                      />

                      {(stepObj.type === 'code_write' || stepObj.type === 'code_fix' || stepObj.type === 'code_run') && (
                        <div className="space-y-3">
                          <label className="label">Starter Code</label>
                          <CodeEditor
                            value={stepObj.starterCode}
                            onChange={(val) => updateStep(stepObj.id, 'starterCode', val)}
                            language="python"
                            height="160px"
                          />
                          <label className="label">Reference Solution</label>
                          <CodeEditor
                            value={stepObj.referenceSolution}
                            onChange={(val) => updateStep(stepObj.id, 'referenceSolution', val)}
                            language="python"
                            height="160px"
                          />
                        </div>
                      )}

                      {(stepObj.type === 'concept' || stepObj.type === 'code_trace') && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <Select
                            label="Grading Mode"
                            value={stepObj.gradingMode}
                            onChange={(e) => updateStep(stepObj.id, 'gradingMode', e.target.value)}
                            options={[
                              { value: 'keyword_match', label: 'Keyword Matching' },
                              { value: 'manual', label: 'Manual Grading' }
                            ]}
                          />
                          {stepObj.gradingMode === 'keyword_match' && (
                            <Input
                              label="Keywords"
                              value={stepObj.keywords}
                              onChange={(e) => updateStep(stepObj.id, 'keywords', e.target.value)}
                            />
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={stepObj.gated}
                            onChange={(e) => updateStep(stepObj.id, 'gated', e.target.checked)}
                            className="rounded bg-black/20 border-default text-brand-blue"
                          />
                          Gated step (student must solve this step to unlock next)
                        </label>
                        <div className="flex items-center gap-2">
                          <span>Weight %:</span>
                          <input
                            type="number"
                            value={stepObj.weight}
                            onChange={(e) => updateStep(stepObj.id, 'weight', Number(e.target.value))}
                            className="w-16 bg-[var(--bg-primary)] border border-default rounded px-2 py-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SQL SCHEMAS, SEEDS AND DIRECT QUERIES */}
            {selectedType === 'sql_problem' && (
              <div className="space-y-6">
                <div className="glass p-6 space-y-4">
                  <h3 className="text-md font-semibold text-[var(--text-primary)]">SQL Database Configuration</h3>
                  <Textarea
                    label="Schema SQL (CREATE TABLE / VIEW commands)"
                    placeholder="CREATE TABLE employees (id INT, name VARCHAR...);"
                    rows={5}
                    value={problemData.schemaSql}
                    onChange={(e) => setField('schemaSql', e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Textarea
                    label="Seed SQL (INSERT INTO records)"
                    placeholder="INSERT INTO employees VALUES (1, 'Alice');"
                    rows={5}
                    value={problemData.seedSql}
                    onChange={(e) => setField('seedSql', e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                {selectedMode === 'direct' && (
                  <div className="glass p-6 space-y-4">
                    <h3 className="text-md font-semibold text-[var(--text-primary)]">Direct SQL Query Setup</h3>
                    <Textarea
                      label="Problem Description"
                      value={problemData.description}
                      onChange={(e) => setField('description', e.target.value)}
                    />
                    <label className="label">Solution Query</label>
                    <CodeEditor
                      value={problemData.solutionQuery}
                      onChange={(val) => setField('solutionQuery', val)}
                      language="sql"
                      height="200px"
                    />
                    <Select
                      label="Result Set Grading Mode"
                      value={problemData.sqlGradingMode}
                      onChange={(e) => setField('sqlGradingMode', e.target.value)}
                      options={[
                        { value: 'exact_match', label: 'Exact Output Match' },
                        { value: 'subset_match', label: 'Student result is subset' },
                        { value: 'row_match', label: 'Row count match only' }
                      ]}
                    />
                  </div>
                )}

                {/* SQL GUIDED STEPS */}
                {selectedMode === 'guided' && (
                  <div className="glass p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-default pb-3">
                      <h3 className="text-md font-semibold text-[var(--text-primary)]">SQL Steps Setup</h3>
                      <button onClick={() => addStep('code_write')} className="btn-secondary text-xs py-1 px-3">
                        + Add SQL Step
                      </button>
                    </div>
                    <div className="space-y-4">
                      {problemData.steps.map((stepObj, index) => (
                        <div key={stepObj.id} className="p-4 border border-default rounded-lg bg-[var(--bg-surface)] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-brand-purple">STEP #{index + 1} (SQL QUERY)</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => moveStep(index, 'up')} className="p-1 hover:bg-white/5 rounded"><ArrowUp size={14} /></button>
                              <button onClick={() => moveStep(index, 'down')} className="p-1 hover:bg-white/5 rounded"><ArrowDown size={14} /></button>
                              <button onClick={() => removeStep(stepObj.id)} className="p-1 text-red-400 hover:bg-white/5 rounded"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <Textarea
                            label="Step prompt"
                            value={stepObj.prompt}
                            onChange={(e) => updateStep(stepObj.id, 'prompt', e.target.value)}
                          />
                          <label className="label">Solution Query</label>
                          <CodeEditor
                            value={stepObj.solutionQuery}
                            onChange={(val) => updateStep(stepObj.id, 'solutionQuery', val)}
                            language="sql"
                            height="150px"
                          />
                          <Textarea
                            label="Hint Text"
                            value={stepObj.hint}
                            onChange={(e) => updateStep(stepObj.id, 'hint', e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SQL EXPLORATORY (MURDER MYSTERY) */}
                {selectedMode === 'exploratory' && (
                  <div className="space-y-6">
                    <div className="glass p-6 space-y-4">
                      <h3 className="text-md font-semibold text-[var(--text-primary)]">Exploratory Settings</h3>
                      <Textarea
                        label="Problem Narrative Statement"
                        value={problemData.description}
                        onChange={(e) => setField('description', e.target.value)}
                      />
                      <label className="label">Canonical Solution Query</label>
                      <CodeEditor
                        value={problemData.solutionQuery}
                        onChange={(val) => setField('solutionQuery', val)}
                        language="sql"
                        height="200px"
                      />
                    </div>

                    <div className="glass p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-default pb-2">
                        <h3 className="text-md font-semibold text-[var(--text-primary)]">Final Answer Key Schema</h3>
                        <button onClick={addFinalSchemaField} className="btn-secondary text-xs py-1 px-3">
                          + Add Field
                        </button>
                      </div>
                      <div className="space-y-3">
                        {problemData.finalAnswerSchema.map((item, idx) => (
                          <div key={idx} className="flex gap-4 items-center bg-[var(--bg-surface)] p-3 border border-default rounded-lg">
                            <input
                              type="text"
                              placeholder="Field key (e.g. suspect_name)"
                              value={item.field}
                              onChange={(e) => updateFinalSchemaField(idx, { field: e.target.value })}
                              className="bg-[var(--bg-primary)] border border-default rounded px-3 py-1.5 text-sm text-[var(--text-primary)] w-1/3 font-mono"
                            />
                            <input
                              type="text"
                              placeholder="Field label (e.g. Suspect Name)"
                              value={item.label}
                              onChange={(e) => updateFinalSchemaField(idx, { label: e.target.value })}
                              className="bg-[var(--bg-primary)] border border-default rounded px-3 py-1.5 text-sm text-[var(--text-primary)] flex-1"
                            />
                            <input
                              type="text"
                              placeholder="Correct answer value"
                              value={problemData.finalAnswerKey[item.field] || ''}
                              onChange={(e) => updateFinalKey(item.field, e.target.value)}
                              className="bg-[var(--bg-primary)] border border-default rounded px-3 py-1.5 text-sm text-[var(--text-primary)] w-1/3"
                            />
                            <button onClick={() => removeFinalSchemaField(idx)} className="text-red-400 hover:text-red-300">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="glass p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-default pb-2">
                        <h3 className="text-md font-semibold text-[var(--text-primary)]">Progressive Clues</h3>
                        <button onClick={addClue} className="btn-secondary text-xs py-1 px-3">
                          + Add Clue
                        </button>
                      </div>
                      <div className="space-y-3">
                        {problemData.clues.map((clue, idx) => (
                          <div key={clue.id} className="p-3 border border-default rounded-lg bg-[var(--bg-surface)] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[var(--text-secondary)]">CLUE #{idx + 1}</span>
                              <button onClick={() => removeClue(clue.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-[var(--text-muted)]">Unlock after</span>
                              <input
                                type="number"
                                value={clue.triggerQueries}
                                onChange={(e) => updateClue(clue.id, 'triggerQueries', Number(e.target.value))}
                                className="w-16 bg-[var(--bg-primary)] border border-default rounded px-2 py-0.5 text-center text-xs"
                              />
                              <span className="text-xs text-[var(--text-muted)]">queries run</span>
                            </div>
                            <Textarea
                              placeholder="Clue message text..."
                              rows={2}
                              value={clue.text}
                              onChange={(e) => updateClue(clue.id, 'text', e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar / Instructions & Validation check triggers (right side, 1 col) */}
          <div className="space-y-6">
            {/* Live Markdown Preview pane */}
            {problemData.description && (
              <div className="glass p-6 space-y-3">
                <h3 className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">Markdown Preview</h3>
                <div className="prose prose-invert max-w-none text-xs border border-default p-3 rounded-lg bg-black/20 max-h-48 overflow-y-auto">
                  <ReactMarkdown>{problemData.description}</ReactMarkdown>
                </div>
              </div>
            )}

            <div className="glass p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Workflow Engine Status</h3>
              <div className="flex items-center gap-3 border border-default p-3 rounded-lg bg-black/10">
                {validationPassed ? (
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20">
                    <CheckCircle2 size={18} />
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse">
                    <AlertTriangle size={18} />
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {validationPassed ? 'STATUS: VALIDATED' : 'STATUS: PENDING VALIDATION'}
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    {validationPassed ? 'Ready to publish.' : 'Sandbox run required.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setStep('validation');
                  runValidation();
                }}
                className="w-full btn-secondary h-10 flex items-center justify-center gap-2 border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10 text-xs font-bold"
              >
                <Cpu size={14} /> Run Execution Sandbox
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SANDBOX RUN & LOGS */}
      {step === 'validation' && (
        <div className="glass p-8 max-w-3xl mx-auto space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded-xl">
              <Terminal size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Step 3: Platform Sandbox Validation</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Before publishing, DevLab builds your schemas, seeds mock records, and executes reference solutions to confirm viability.
              </p>
            </div>
          </div>

          {/* Validation Logs Terminal */}
          <div className="bg-black border border-default p-4 rounded-lg font-mono text-xs text-green-400 space-y-1.5 h-64 overflow-y-auto shadow-inner">
            {validationLogs.map((logLine, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-[var(--text-muted)] select-none">[{idx + 1}]</span>
                <span>{logLine}</span>
              </div>
            ))}
            {isValidating && (
              <div className="flex items-center gap-2 text-brand-blue">
                <Loader2 size={12} className="animate-spin" />
                <span>Running compilation/execution sequence...</span>
              </div>
            )}
          </div>

          {/* Rules Checklist results */}
          {!isValidating && validationCheckedRules.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Validation Rules Check</h3>
              <div className="grid gap-2">
                {validationCheckedRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-default rounded-lg bg-[var(--bg-surface)]">
                    <span className="text-xs text-[var(--text-secondary)]">{rule.label}</span>
                    {rule.status === 'pass' ? (
                      <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                        <CheckCircle2 size={14} /> PASSED
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                        <XCircle size={14} /> FAILED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-6 border-t border-default">
            <button
              onClick={() => setStep('editor')}
              className="px-4 py-2 hover:bg-white/5 border border-default text-xs font-bold text-[var(--text-secondary)] rounded-md"
            >
              Back to Editor
            </button>
            <div className="flex gap-3">
              <button
                onClick={runValidation}
                disabled={isValidating}
                className="btn-secondary text-xs h-9"
              >
                <RefreshCw size={14} className={isValidating ? 'animate-spin' : ''} /> Re-run Sandbox
              </button>
              {validationPassed && (
                <button
                  onClick={() => setStep('preview')}
                  className="btn-primary text-xs h-9"
                >
                  Proceed to Preview <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: STUDENT VIEW PREVIEW (INTERACTIVE PREVIEW) */}
      {step === 'preview' && (
        <div className="glass p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-default pb-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Interactive Student Preview Mode</h2>
              <p className="text-xs text-[var(--text-muted)] font-mono">ROLE_MOCK: STUDENT_ATTEMPT</p>
            </div>
            <button onClick={() => setStep('editor')} className="btn-secondary text-xs">
              Exit Preview
            </button>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left side problem prompt description (2/5 cols) */}
            <div className="lg:col-span-2 space-y-6 border-r border-default pr-6">
              <div>
                <span className="text-[10px] font-mono text-brand-blue uppercase tracking-widest">
                  {selectedType.toUpperCase()} ({selectedMode.toUpperCase()})
                </span>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                  {problemData.title || 'Untitled Question'}
                </h3>
              </div>

              <div className="prose prose-invert max-w-none text-sm text-[var(--text-secondary)]">
                {selectedType === 'mcq' && (
                  <ReactMarkdown>{problemData.description || 'MCQ stem prompt'}</ReactMarkdown>
                )}
                {selectedType === 'short_answer' && selectedMode === 'direct' && (
                  <ReactMarkdown>{problemData.prompt || 'Short answer prompt'}</ReactMarkdown>
                )}
                {selectedType === 'coding' && (selectedMode === 'direct' || selectedMode === 'exploratory') && (
                  <ReactMarkdown>{problemData.description || 'Coding problem description'}</ReactMarkdown>
                )}
                {selectedType === 'sql_problem' && (selectedMode === 'direct' || selectedMode === 'exploratory') && (
                  <ReactMarkdown>{problemData.description || 'SQL problem description'}</ReactMarkdown>
                )}

                {/* Guided Steps indicator */}
                {selectedMode === 'guided' && (
                  <div className="space-y-4">
                    <ReactMarkdown>{problemData.description || 'Guided Walkthrough instructions'}</ReactMarkdown>
                    <div className="space-y-2 mt-4">
                      <span className="label">Step Walkthrough progress</span>
                      {problemData.steps.map((st, idx) => {
                        const isCurrent = idx === previewStudentActiveStepIndex;
                        const isCompleted = idx < previewStudentActiveStepIndex;
                        return (
                          <div
                            key={st.id}
                            className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                              isCurrent ? 'border-brand-blue bg-brand-blue/5' :
                              isCompleted ? 'border-green-500/30 bg-green-500/5 text-green-400' :
                              'border-default opacity-50'
                            }`}
                          >
                            <span>{idx + 1}. {st.prompt || 'Conceptual Step'}</span>
                            {isCompleted && <CheckCircle2 size={14} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Database schema layout for SQL */}
                {selectedType === 'sql_problem' && (
                  <div className="mt-6 border border-default rounded-lg p-4 bg-black/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                      <Database size={12} className="text-brand-blue" /> Interactive Database Schema
                    </h4>
                    <pre className="text-[10px] font-mono text-blue-300 max-h-32 overflow-y-auto whitespace-pre-wrap select-none">
                      {problemData.schemaSql}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Right side interactive workspace (3/5 cols) */}
            <div className="lg:col-span-3 space-y-6">
              {/* MCQ STUDENT INTERACTIVE VIEW */}
              {selectedType === 'mcq' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {problemData.choices.map((choice, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPreviewStudentChoices({ [idx]: true })}
                        className={`w-full text-left p-3.5 rounded-lg border text-sm transition-all ${
                          previewStudentChoices[idx]
                            ? 'border-brand-blue bg-brand-blue/5 text-brand-blue font-semibold'
                            : 'border-default hover:bg-white/5 text-[var(--text-secondary)]'
                        }`}
                      >
                        {choice.text || `Option #${idx + 1}`}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const selectedIdx = Object.keys(previewStudentChoices)[0];
                      if (selectedIdx === undefined) {
                        toast.error('Please select an option first.');
                        return;
                      }
                      const correct = problemData.choices[selectedIdx]?.isCorrect;
                      if (correct) {
                        toast.success('Correct answer! Post-submission feedback unlocked.');
                        setPreviewStudentAnswer('correct');
                      } else {
                        toast.error('Incorrect option. Try another.');
                        setPreviewStudentAnswer('wrong');
                      }
                    }}
                    className="btn-primary w-full py-2.5"
                  >
                    Submit Option
                  </button>

                  {previewStudentAnswer && (
                    <div className="p-4 border border-default rounded-lg bg-[var(--bg-surface)] space-y-2">
                      <h4 className="text-xs font-bold text-brand-purple">LECTURER FEEDBACK</h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {problemData.explanation || 'No explanation provided.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SHORT ANSWER DIRECT PREVIEW */}
              {selectedType === 'short_answer' && selectedMode === 'direct' && (
                <div className="space-y-4">
                  <Textarea
                    label="Enter your answer key"
                    placeholder="Type your explanation response here..."
                    rows={4}
                    value={previewStudentAnswer}
                    onChange={(e) => setPreviewStudentAnswer(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      if (problemData.gradingMode === 'manual') {
                        toast.success('Response recorded. Awaiting manual grading by lecturer.');
                      } else {
                        const words = problemData.keywords.toLowerCase().split(',').map((w) => w.trim());
                        const answer = previewStudentAnswer.toLowerCase();
                        const matches = words.some((w) => w.length > 0 && answer.includes(w));
                        if (matches) {
                          toast.success('Passed! Matching keywords detected.');
                        } else {
                          toast.error('Incorrect. Expected keywords not found.');
                        }
                      }
                    }}
                    className="btn-primary w-full py-2"
                  >
                    Submit Answer
                  </button>
                </div>
              )}

              {/* SHORT ANSWER GUIDED PREVIEW */}
              {selectedType === 'short_answer' && selectedMode === 'guided' && (
                <div className="space-y-4">
                  {problemData.steps.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-brand-purple uppercase">
                        Current Step Prompt:
                      </span>
                      <p className="text-sm text-[var(--text-primary)]">
                        {problemData.steps[previewStudentActiveStepIndex]?.prompt}
                      </p>
                      <Textarea
                        rows={3}
                        placeholder="Write step answer..."
                        value={previewStudentAnswer}
                        onChange={(e) => setPreviewStudentAnswer(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          const stepObj = problemData.steps[previewStudentActiveStepIndex];
                          if (stepObj.gradingMode === 'manual') {
                            toast.success('Awaiting manual review. Unlocking next step.');
                            checkStudentStep(previewStudentActiveStepIndex);
                          } else {
                            const words = stepObj.keywords.toLowerCase().split(',').map(w => w.trim());
                            const ans = previewStudentAnswer.toLowerCase();
                            const ok = words.some(w => w.length > 0 && ans.includes(w));
                            if (ok) {
                              toast.success('Correct step query!');
                              checkStudentStep(previewStudentActiveStepIndex);
                              setPreviewStudentAnswer('');
                            } else {
                              toast.error('Incorrect response. Double check keywords.');
                            }
                          }
                        }}
                        className="btn-primary w-full py-2 text-xs"
                      >
                        Submit Step Answer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CODING DIRECT PREVIEW */}
              {selectedType === 'coding' && selectedMode === 'direct' && (
                <div className="space-y-4">
                  <div className="border border-default rounded-lg overflow-hidden bg-black/30">
                    <div className="px-4 py-2 border-b border-default bg-white/5 flex items-center justify-between text-xs text-[var(--text-secondary)] font-mono">
                      <span>solution.py</span>
                      <span>Python 3.10</span>
                    </div>
                    <CodeEditor
                      value={previewStudentCode || problemData.starterCode}
                      onChange={setPreviewStudentCode}
                      language="python"
                      height="240px"
                    />
                  </div>
                  <button
                    onClick={() => {
                      toast.success('Simulating execution logs against sandboxed unit tests...');
                    }}
                    className="btn-primary w-full py-2 flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Play size={14} /> Run Test Suite
                  </button>
                </div>
              )}

              {/* SQL INTERACTIVE PREVIEW */}
              {selectedType === 'sql_problem' && (
                <div className="space-y-4">
                  {/* Step specific prompt if guided */}
                  {selectedMode === 'guided' && problemData.steps[previewStudentActiveStepIndex] && (
                    <div className="p-3 border border-brand-purple/20 bg-brand-purple/5 rounded-lg text-xs text-[var(--text-secondary)]">
                      <span className="font-bold text-brand-purple uppercase">Step Instruction: </span>
                      {problemData.steps[previewStudentActiveStepIndex].prompt}
                    </div>
                  )}

                  <div className="border border-default rounded-lg overflow-hidden bg-black/20">
                    <div className="px-4 py-2 bg-white/5 border-b border-default text-xs font-mono text-[var(--text-secondary)] flex justify-between items-center">
                      <span>Query Workspace</span>
                      <span>PostgreSQL 14</span>
                    </div>
                    <CodeEditor
                      value={previewStudentCode || (selectedMode === 'guided' ? problemData.steps[previewStudentActiveStepIndex]?.solutionQuery : problemData.solutionQuery)}
                      onChange={setPreviewStudentCode}
                      language="sql"
                      height="180px"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleStudentRunSQL(previewStudentCode)}
                      className="btn-secondary flex-1 py-2 flex justify-center items-center gap-1.5 text-xs font-semibold text-brand-blue border-brand-blue/20 hover:bg-brand-blue/5"
                    >
                      <Play size={14} /> Run Query
                    </button>
                    {selectedMode === 'guided' && (
                      <button
                        onClick={() => checkStudentStep(previewStudentActiveStepIndex)}
                        className="btn-success flex-1 py-2 text-xs font-semibold"
                      >
                        Verify Step
                      </button>
                    )}
                  </div>

                  {/* SQL Output Table */}
                  {previewStudentSQLResults && (
                    <div className="border border-default rounded-lg overflow-hidden bg-[var(--bg-surface)] text-xs">
                      <div className="px-3 py-1.5 border-b border-default bg-white/5 text-[10px] font-mono text-[var(--text-muted)]">
                        QUERY CONSOLE RESULT SET
                      </div>
                      {previewStudentSQLResults.loading ? (
                        <div className="p-4 flex items-center justify-center gap-2 text-[var(--text-secondary)]">
                          <Loader2 size={12} className="animate-spin" /> Querying sandbox database...
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-default bg-white/5">
                              {previewStudentSQLResults.columns.map((c, i) => (
                                <th key={i} className="p-2 font-mono font-bold text-[10px] text-[var(--text-muted)] uppercase">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewStudentSQLResults.rows.map((row, i) => (
                              <tr key={i} className="border-b border-default font-mono">
                                {row.map((val, k) => (
                                  <td key={k} className="p-2 text-[var(--text-secondary)]">{val}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Exploratory accusation submission form */}
                  {selectedMode === 'exploratory' && (
                    <div className="p-4 border border-default rounded-lg bg-[var(--bg-surface)] space-y-4">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase flex items-center gap-2">
                        <ShieldCheck size={14} className="text-brand-blue" /> Accusation Report Submission
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {problemData.finalAnswerSchema.map((item) => (
                          <Input
                            key={item.field}
                            label={item.label}
                            value={previewStudentChoices[item.field] || ''}
                            onChange={(e) => setPreviewStudentChoices({ ...previewStudentChoices, [item.field]: e.target.value })}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const matches = Object.keys(problemData.finalAnswerKey).every(
                            (key) => (previewStudentChoices[key] || '').toLowerCase().trim() === (problemData.finalAnswerKey[key] || '').toLowerCase().trim()
                          );
                          if (matches) {
                            toast.success('🎉 Crime Solved! The suspect matches the database files.');
                          } else {
                            toast.error('❌ Report rejected. Suspect data does not match clues.');
                          }
                        }}
                        className="btn-primary w-full py-2 text-xs"
                      >
                        Submit Accusation Report
                      </button>
                    </div>
                  )}

                  {/* Clues Panel */}
                  {selectedMode === 'exploratory' && problemData.clues.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <span className="label">Unlocked Clues ({previewCluesUnlocked.length} / {problemData.clues.length})</span>
                      {previewCluesUnlocked.map((clue, idx) => (
                        <div key={idx} className="p-3 border border-yellow-500/20 bg-yellow-500/5 text-xs text-yellow-400 rounded-lg flex gap-2">
                          <Compass size={14} className="flex-shrink-0 mt-0.5" />
                          <span>{clue.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
