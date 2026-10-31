import { slugify } from '@/lib/utils';
import { saveCategory } from '@/services/categoryService';
import { saveTest } from '@/services/testService';
import { writeQuestionBatch } from '@/services/questionService';

type SeedQuestion = [text: string, options: [string, string, string, string], correct: number, explanation: string, topic: string];

interface SeedCategory {
  key: string;
  name: string;
  description: string;
  icon: string;
}

interface SeedTest {
  categoryKey: string;
  title: string;
  description: string;
  section: string;
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isPaid: boolean;
  questions: SeedQuestion[];
}

const CATEGORIES: SeedCategory[] = [
  { key: 'quant', name: 'Quantitative Aptitude', description: 'Numbers, algebra, percentages and speed problems.', icon: 'calculator' },
  { key: 'logic', name: 'Logical Reasoning', description: 'Series, coding, syllogisms and sharp thinking.', icon: 'brain' },
  { key: 'di', name: 'Data Interpretation', description: 'Read tables, charts and graphs with confidence.', icon: 'chart' },
  { key: 'mixed', name: 'Mixed Practice', description: 'Full-length mixed sets to build exam stamina.', icon: 'layers' },
];

const TESTS: SeedTest[] = [
  {
    categoryKey: 'quant',
    title: 'Quant Foundations Mock 1',
    description: 'A short warm-up covering the core quantitative topics.',
    section: 'Quantitative Aptitude',
    durationMinutes: 30,
    difficulty: 'easy',
    isPaid: false,
    questions: [
      ['If $x = 2$, what is $x^{3}$?', ['6', '8', '4', '9'], 1, '$2^{3} = 8$.', 'Algebra'],
      ['If 25% of a number is 60, what is the number?', ['180', '200', '240', '280'], 2, '$\\frac{60}{0.25} = 240$.', 'Percentages'],
      ['What is the value of $\\sqrt{144} + 3^{2}$?', ['19', '21', '23', '25'], 1, '$\\sqrt{144} = 12$ and $3^{2} = 9$, so the sum is $21$.', 'Number System'],
      ['What is the LCM of 12 and 18?', ['36', '54', '72', '6'], 0, '$12 = 2^{2} \\cdot 3$ and $18 = 2 \\cdot 3^{2}$, so LCM $= 2^{2} \\cdot 3^{2} = 36$.', 'Number System'],
      ['A 150 m long train passes a pole in 15 seconds. What is its speed?', ['10 m/s', '15 m/s', '12 m/s', '9 m/s'], 0, 'Speed $= \\frac{150}{15} = 10$ m/s.', 'Speed and Distance'],
      ['Simplify $\\frac{2}{3} + \\frac{1}{6}$.', ['$\\frac{5}{6}$', '$\\frac{3}{6}$', '$\\frac{1}{2}$', '$\\frac{7}{6}$'], 0, '$\\frac{4}{6} + \\frac{1}{6} = \\frac{5}{6}$.', 'Fractions'],
      ['If $3x - 7 = 20$, find $x$.', ['7', '9', '11', '13'], 1, '$3x = 27$, so $x = 9$.', 'Linear Equations'],
      ['Two pipes fill a tank in 4 hours and 6 hours. Together, how long do they take?', ['2.4 hours', '5 hours', '2 hours', '3.6 hours'], 0, 'Combined rate $= \\frac{1}{4} + \\frac{1}{6} = \\frac{5}{12}$, so time $= \\frac{12}{5} = 2.4$ hours.', 'Time and Work'],
      ['Two parts are in the ratio 3:5 and their sum is 96. What is the larger part?', ['56', '60', '36', '40'], 1, 'Larger part $= \\frac{5}{8} \\times 96 = 60$.', 'Ratio and Proportion'],
      ['What is 15% of 240?', ['24', '36', '32', '30'], 1, '$0.15 \\times 240 = 36$.', 'Percentages'],
    ],
  },
  {
    categoryKey: 'logic',
    title: 'Logical Reasoning Sprint',
    description: 'Ten quick reasoning questions to sharpen pattern recognition.',
    section: 'Logical Reasoning',
    durationMinutes: 20,
    difficulty: 'medium',
    isPaid: false,
    questions: [
      ['What comes next: 2, 6, 12, 20, 30, ?', ['40', '42', '44', '48'], 1, 'The differences are 4, 6, 8, 10, 12, so the next term is $30 + 12 = 42$.', 'Number Series'],
      ['Which word does not belong with the others? Apple, Mango, Carrot, Banana', ['Apple', 'Mango', 'Carrot', 'Banana'], 2, 'Carrot is a vegetable. The others are fruits.', 'Classification'],
      ['All roses are flowers. All flowers need water. Which statement must be true?', ['All roses need water', 'Some flowers are roses', 'No roses need water', 'All water is a flower'], 0, 'Every rose is a flower, and every flower needs water, so every rose needs water.', 'Syllogism'],
      ['If CAT is coded as 3-1-20, how is DOG coded?', ['4-15-7', '4-15-6', '5-14-7', '4-16-7'], 0, 'D is 4, O is 15 and G is 7 in alphabetical position.', 'Coding and Decoding'],
      ['Find the odd one out: 4, 9, 16, 21, 25', ['4', '9', '21', '25'], 2, '4, 9, 16 and 25 are perfect squares. 21 is not.', 'Classification'],
      ['What comes next in the letter series: A, C, F, J, O, ?', ['S', 'T', 'U', 'V'], 2, 'The gaps grow by one each time: +2, +3, +4, +5, +6. O + 6 = U.', 'Letter Series'],
      ['If A is taller than B and B is taller than C, who is the shortest?', ['A', 'B', 'C', 'It cannot be determined'], 2, 'C is shorter than B, and B is shorter than A, so C is the shortest.', 'Ranking'],
      ['Today is Monday. What day will it be 100 days from today?', ['Monday', 'Tuesday', 'Wednesday', 'Friday'], 2, '100 divided by 7 leaves a remainder of 2. Monday + 2 days = Wednesday.', 'Calendar'],
      ["Pointing to a man, a woman says, \"His mother is the only daughter of my mother.\" How is the woman related to the man?", ['Sister', 'Mother', 'Aunt', 'Daughter'], 1, "The only daughter of the woman's mother is the woman herself, so she is the man's mother.", 'Blood Relations'],
      ['What comes next: 1, 4, 9, 16, ?', ['20', '24', '25', '36'], 2, 'These are consecutive perfect squares: $1^{2}, 2^{2}, 3^{2}, 4^{2}, 5^{2}$.', 'Number Series'],
    ],
  },
  {
    categoryKey: 'di',
    title: 'Data Interpretation Premium Mock',
    description: 'A premium set on tables, charts and percentages. Premium students only.',
    section: 'Data Interpretation',
    durationMinutes: 45,
    difficulty: 'hard',
    isPaid: true,
    questions: [
      ['Monthly sales (units) for four months are 120, 150, 180 and 150. What is the average?', ['140', '150', '160', '170'], 1, 'The total is $600$, and $\\frac{600}{4} = 150$.', 'Averages'],
      ['Sales were 120 units in January and 180 units in March. What is the ratio January : March?', ['2:3', '3:2', '1:2', '2:5'], 0, '$120 : 180 = 2 : 3$ after dividing both by 60.', 'Ratio'],
      ['Sales rose from 120 units to 150 units. What is the percentage increase?', ['20%', '25%', '30%', '15%'], 1, '$\\frac{30}{120} \\times 100 = 25\\%$.', 'Percentages'],
      ['In a pie chart, a sector measures 90 degrees. What percentage of the whole does it represent?', ['20%', '25%', '30%', '45%'], 1, '$\\frac{90}{360} \\times 100 = 25\\%$.', 'Pie Charts'],
      ['A company spends 60 lakh and earns a profit of 15 lakh. What is the profit as a percentage of expenses?', ['15%', '20%', '25%', '40%'], 2, '$\\frac{15}{60} \\times 100 = 25\\%$.', 'Profit and Loss'],
      ['What is the median of 3, 7, 9, 12 and 15?', ['7', '9', '10', '12'], 1, 'The middle value of the ordered list is 9.', 'Median'],
      ['What is the mean of 10, 20 and 30?', ['10', '15', '20', '25'], 2, '$\\frac{10 + 20 + 30}{3} = 20$.', 'Averages'],
      ['A total of 500 items has a part that is 40% of the total. How many items are in that part?', ['150', '200', '250', '400'], 1, '$0.40 \\times 500 = 200$.', 'Percentages'],
      ['Bar A shows 80 and Bar B shows 120. By what percentage is B more than A?', ['25%', '40%', '50%', '60%'], 2, '$\\frac{120 - 80}{80} \\times 100 = 50\\%$.', 'Bar Charts'],
      ['What is the average of 45 and 75?', ['55', '60', '65', '70'], 1, '$\\frac{45 + 75}{2} = 60$.', 'Averages'],
    ],
  },
];

const INSTRUCTIONS = [
  'Each correct answer earns the full marks for that question.',
  'Each wrong answer deducts the negative marks set for the test. Unanswered questions carry no penalty.',
  'You can mark questions for review and return to them before you submit.',
  'The test submits automatically when the timer reaches zero.',
].join('\n');

// Creates sample categories, published tests and their questions. Returns how many tests were created.
export async function seedSampleData(): Promise<number> {
  const categoryIds = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const id = await saveCategory({
      name: category.name,
      slug: slugify(category.name),
      description: category.description,
      icon: category.icon,
      parentId: null,
      order: index + 1,
      isActive: true,
    });
    categoryIds.set(category.key, id);
  }

  for (const test of TESTS) {
    const testId = await saveTest({
      categoryId: categoryIds.get(test.categoryKey) ?? '',
      title: test.title,
      description: test.description,
      durationMinutes: test.durationMinutes,
      negativeMarks: 0.25,
      instructions: INSTRUCTIONS,
      language: 'English',
      difficulty: test.difficulty,
      isPaid: test.isPaid,
      status: 'published',
    });
    await writeQuestionBatch(
      testId,
      test.questions.map(([text, options, correct, explanation, topic], index) => ({
        data: { section: test.section, text, imageUrl: '', options: [...options], explanation, topic, marks: 1, negativeMarks: null },
        correctOption: correct,
        order: index + 1,
      })),
    );
  }

  return TESTS.length;
}
