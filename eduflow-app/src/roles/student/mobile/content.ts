/* Lesson content written for Greenfield's Grade 9 chapters: video chapter markers and notes. */

export interface VideoChapter { at: number /* 0..1 */; title: string; board: string; caption: string }

/** What the faux player shows on its "board" as the lesson plays. */
export const VIDEO_CHAPTERS: Record<string, VideoChapter[]> = {
  'ls-1': [
    { at: 0, title: 'Why factorise?', board: 'x² − 5x + 6 = 0', caption: 'If a product is zero, one of the factors must be zero.' },
    { at: 0.2, title: 'Splitting the middle term', board: '−5x = −2x − 3x', caption: 'Find two numbers that multiply to 6 and add to −5.' },
    { at: 0.45, title: 'The tiles model', board: '(x − 2)(x − 3)', caption: 'One x² tile, five x strips, six unit squares — arranged into a rectangle.' },
    { at: 0.7, title: 'Worked examples', board: '2x² + 7x + 3 = 0', caption: 'Multiply a × c = 6, then split 7x into 6x + x.' },
    { at: 0.9, title: 'Recap', board: 'x = 2  or  x = 3', caption: 'Always check your roots by substituting back.' },
  ],
  'ls-4': [
    { at: 0, title: 'Safety in the lab', board: 'Goggles · Apron · Tongs', caption: 'A walk along the bench before the first reaction.' },
    { at: 0.18, title: 'Combination', board: '2Mg + O₂ → 2MgO', caption: 'Magnesium ribbon burns with a dazzling white flame.' },
    { at: 0.4, title: 'Decomposition', board: 'CaCO₃ → CaO + CO₂', caption: 'Heat breaks one reactant into two products.' },
    { at: 0.62, title: 'Displacement', board: 'Fe + CuSO₄ → FeSO₄ + Cu', caption: 'The iron nail turns brown; the blue solution fades to green.' },
    { at: 0.84, title: 'Double displacement', board: 'Na₂SO₄ + BaCl₂ → BaSO₄↓ + 2NaCl', caption: 'A white precipitate forms the moment the solutions meet.' },
  ],
  'ls-7': [
    { at: 0, title: 'France before 1789', board: 'Clergy · Nobility · Third Estate', caption: 'Ninety percent of the people paid almost all of the taxes.' },
    { at: 0.25, title: 'Estates-General', board: '5 May 1789', caption: 'Louis XVI calls the assembly to approve new taxes.' },
    { at: 0.5, title: 'The Tennis Court Oath', board: '20 June 1789', caption: 'The Third Estate swears not to disperse until France has a constitution.' },
    { at: 0.72, title: 'Storming of the Bastille', board: '14 July 1789', caption: 'The fortress-prison falls; the revolution reaches the streets.' },
    { at: 0.9, title: 'Rights of Man', board: 'August 1789', caption: 'Liberty, freedom of speech and equality before law.' },
  ],
  'ls-8': [
    { at: 0, title: 'Why loops?', board: 'print(1) … print(100)', caption: 'Writing the same line a hundred times is a sign you need a loop.' },
    { at: 0.22, title: 'for with range()', board: 'for i in range(1, 6):', caption: 'range(1, 6) gives 1, 2, 3, 4, 5 — the end is not included.' },
    { at: 0.48, title: 'while loops', board: 'while n > 0:', caption: 'Keep going while a condition is true. Change n, or it never stops.' },
    { at: 0.7, title: 'break and continue', board: 'if n % 7 == 0: break', caption: 'Leave the loop early, or skip to the next round.' },
    { at: 0.88, title: 'Practice set', board: 'Sum of 1 to n', caption: 'Try it with both a for loop and a while loop.' },
  ],
}

export const fallbackChapters = (title: string): VideoChapter[] => [
  { at: 0, title: 'Introduction', board: title, caption: 'What we will cover today.' },
  { at: 0.5, title: 'Main idea', board: title, caption: 'Working through the core concept.' },
  { at: 0.85, title: 'Recap', board: title, caption: 'Three things to remember.' },
]

export type NoteBlock =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'math'; text: string; note?: string }
  | { t: 'steps'; items: string[] }
  | { t: 'callout'; title: string; text: string }
  | { t: 'quote'; text: string; by?: string }

export interface Notes { intro: string; blocks: NoteBlock[]; lang?: 'hi' }

export const NOTES: Record<string, Notes> = {
  'ls-2': {
    intro: 'Factorising is quick when the numbers are friendly. Completing the square works for every quadratic — and it is where the quadratic formula comes from.',
    blocks: [
      { t: 'h', text: 'The idea' },
      { t: 'p', text: 'We want to rewrite x² + bx as part of a perfect square. Since (x + k)² = x² + 2kx + k², the expression x² + bx is a perfect square that is missing its last term, (b/2)².' },
      { t: 'math', text: 'x² + bx = (x + b⁄2)² − (b⁄2)²', note: 'Add and subtract the square of half the coefficient of x.' },
      { t: 'h', text: 'Method, step by step' },
      { t: 'steps', items: [
        'Make the coefficient of x² equal to 1 (divide every term by a).',
        'Move the constant term to the right-hand side.',
        'Add (b/2)² to both sides.',
        'Write the left side as a square: (x + b/2)².',
        'Take the square root of both sides — remember the ±.',
        'Solve for x.',
      ] },
      { t: 'h', text: 'Worked example' },
      { t: 'p', text: 'Solve x² + 6x − 7 = 0.' },
      { t: 'math', text: 'x² + 6x = 7' },
      { t: 'math', text: 'x² + 6x + 9 = 7 + 9', note: 'Half of 6 is 3, and 3² = 9.' },
      { t: 'math', text: '(x + 3)² = 16' },
      { t: 'math', text: 'x + 3 = ±4   ⇒   x = 1  or  x = −7' },
      { t: 'callout', title: 'Check yourself', text: 'Substitute x = 1: 1 + 6 − 7 = 0. Substitute x = −7: 49 − 42 − 7 = 0. Both work.' },
      { t: 'h', text: 'Where the formula comes from' },
      { t: 'p', text: 'Apply the same steps to ax² + bx + c = 0 and you arrive at the quadratic formula. The expression under the root, b² − 4ac, is the discriminant — it tells you whether the roots are real before you solve anything.' },
      { t: 'math', text: 'x = (−b ± √(b² − 4ac)) ⁄ 2a' },
      { t: 'callout', title: 'Try this before the quiz', text: 'Solve 2x² − 8x + 6 = 0 by completing the square. (Hint: divide by 2 first.) Answer: x = 1 or x = 3.' },
    ],
  },
  'ls-6': {
    intro: 'Vaikom Muhammad Basheer tells a story against himself: a young homeopath, a snake, and a mirror. Read it for the humour — then for what it says about vanity and fear.',
    blocks: [
      { t: 'h', text: 'The story in brief' },
      { t: 'p', text: 'The narrator, a homeopathic doctor with a small practice and a large opinion of his own looks, returns to his rented room one hot night. While he is admiring himself in the mirror and planning a smarter future, a snake drops from the rafters onto his shoulder and coils around his arm.' },
      { t: 'p', text: 'He sits as still as stone, barely breathing, and prays. Then the snake notices the mirror — and becomes far more interested in its own reflection than in him. The doctor seizes the moment and runs out of the room.' },
      { t: 'h', text: 'How Basheer makes us laugh' },
      { t: 'steps', items: [
        'Self-mockery: the narrator exaggerates his own vanity — the smile he practises, the moustache he plans to grow.',
        'Contrast: grand thoughts about the future collide with a very real snake on his arm.',
        'Understatement: terror is described calmly, which makes it funnier.',
        'The twist: the snake, too, seems vain — it gazes at the mirror.',
      ] },
      { t: 'quote', text: 'The funniest stories are often the ones we tell against ourselves.', by: 'Mr. Pillai, in class' },
      { t: 'h', text: 'Themes to write about' },
      { t: 'p', text: 'Vanity: the mirror opens and closes the danger. Fear: how panic changes the way we think — the narrator\'s resolutions shrink to the simple wish to survive. Humour as a way of telling hard experiences.' },
      { t: 'callout', title: 'For your answer booklet', text: 'Use one quotation per point and explain its effect in a sentence. Mr. Pillai\'s tip: vary sentence length when you build up tension.' },
    ],
  },
  'ls-9': {
    lang: 'hi',
    intro: 'जाबिर हुसैन का यह संस्मरण प्रसिद्ध पक्षी-विज्ञानी सालिम अली की मृत्यु के बाद लिखा गया है। लेखक उन्हें याद करते हुए प्रकृति के प्रति उनके प्रेम को सामने लाते हैं।',
    blocks: [
      { t: 'h', text: 'पाठ का सार' },
      { t: 'p', text: 'लेखक सालिम अली की अंतिम यात्रा को एक ऐसे सफ़र की तरह देखते हैं जिससे कोई लौटकर नहीं आता। सालिम अली जीवन भर पक्षियों और प्रकृति की खोज में रहे — वे प्रकृति को उसी रूप में देखना चाहते थे जैसी वह है।' },
      { t: 'p', text: 'बचपन में एयरगन से घायल हुई एक गौरैया ने उनके मन में पक्षियों के प्रति जिज्ञासा जगाई। यहीं से वे पक्षी-प्रेमी बने और आगे चलकर देश के सबसे प्रसिद्ध पक्षी-विज्ञानी।' },
      { t: 'p', text: 'लेखक बताते हैं कि सालिम अली ने केरल की ‘साइलेंट वैली’ को बचाने के लिए प्रधानमंत्री चौधरी चरण सिंह के सामने पर्यावरण के ख़तरों की बात रखी थी। उनकी पत्नी तहमीना ने भी उनके काम में साथ दिया।' },
      { t: 'h', text: 'मुख्य बिंदु' },
      { t: 'steps', items: [
        'सालिम अली प्रकृति को ‘अपनी आँखों’ से नहीं, पक्षियों की नज़र से देखना चाहते थे।',
        'लेखक वृंदावन और कृष्ण की स्मृतियों के माध्यम से प्रकृति की सुंदरता का चित्र बनाते हैं।',
        'पाठ हमें पर्यावरण संरक्षण की ज़िम्मेदारी याद दिलाता है।',
      ] },
      { t: 'callout', title: 'परीक्षा के लिए', text: 'प्रश्न: सालिम अली को पक्षी-प्रेमी बनाने वाली घटना कौन-सी थी? — उत्तर में गौरैया वाली घटना का उल्लेख ज़रूर करें।' },
    ],
  },
}
