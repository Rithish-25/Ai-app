import { getGeminiInstance } from '../config/gemini.js';
import { logger } from '../utils/logger.js';

// Helper to clean markdown JSON wrappers from Gemini responses
const parseJsonResponse = (text) => {
  try {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    return JSON.parse(cleanText.trim());
  } catch (error) {
    logger.error(`Error parsing JSON response: ${error.message}\nOriginal Text: ${text}`);
    throw new Error('Failed to parse structured JSON from AI response');
  }
};

// General function to generate content from Gemini model
const generateContent = async (prompt, systemInstruction = '') => {
  const genAI = getGeminiInstance();
  if (!genAI) {
    throw new Error('Gemini API client is not configured.');
  }

  try {
    // In @google/generative-ai SDK: models.get gives access to the model
    // Standard models.get call:
    const modelName = 'gemini-flash-lite-latest';
    
    // Support the new SDK method genAI.models.generateContent
    // or standard fallback if using the standard Node.js client
    let result;
    if (typeof genAI.models?.generateContent === 'function') {
      result = await genAI.models.generateContent({
        model: modelName,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });
    } else if (typeof genAI.getGenerativeModel === 'function') {
      const modelObj = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemInstruction || undefined 
      });
      result = await modelObj.generateContent(prompt);
    } else {
      // Direct raw API fallback if structure varies
      throw new Error('SDK model method not found. Check environment and SDK package versions.');
    }

    const responseText = result.text || result.response?.text?.() || '';
    if (!responseText) {
      throw new Error('Empty response received from Gemini API');
    }
    return responseText;
  } catch (error) {
    logger.error(`Gemini API call failed: ${error.message}`);
    throw error;
  }
};

/**
 * AI Summarize Document
 */
export const generateSummary = async (text) => {
  if (!text || text.trim().length === 0) {
    return 'No text provided for summarization.';
  }

  const prompt = `You are an expert study assistant. Summarize the following study material in clean Markdown.
Include a quick summary, 5-7 key takeaways in bullet points, and an in-depth explanation of core terms and details.
Make it visually appealing with headings, bold text, and lists.

Study material:
${text.substring(0, 30000)} // Truncate to stay within prompt token bounds safely
`;

  try {
    return await generateContent(prompt);
  } catch (error) {
    logger.warn('Gemini summary failed, using fallback summary.');
    return `# Study Summary\n\n*This is a fallback summary because the AI service is currently unavailable.*\n\n### Key Takeaways\n- Main Topic: Study Notes (Length: ${text.length} characters)\n- Review the document file for complete details.`;
  }
};

/**
 * AI Generate Quizzes
 */
export const generateQuiz = async (text, type = 'mcq', count = 5) => {
  const allowedTypes = ['mcq', 'true_false', 'fill_in_blanks', 'short_answer'];
  const quizType = allowedTypes.includes(type) ? type : 'mcq';
  
  const prompt = `You are an educational assessment expert. Generate a quiz containing exactly ${count} questions of type '${quizType}' based on the text below.
You MUST output ONLY a valid JSON array, containing no markdown format tags like \`\`\`json. Just the plain JSON array.
Each object in the array must have the following keys:
1. "questionText": string, the question text
2. "type": string, must be exactly "${quizType}"
3. "options": array of strings (provide exactly 4 choices for MCQ. For true_false, fill_in_blanks, and short_answer, this must be an empty array [])
4. "correctAnswer": string (for MCQ, it must match exactly one of the options. For true_false, it must be exactly "true" or "false". For fill_in_blanks or short_answer, it should be the key correct phrase/term)
5. "explanation": string, explaining the correct answer in detail

Text to base questions on:
${text.substring(0, 15000)}
`;

  try {
    const rawResult = await generateContent(prompt, 'You generate educational quizzes in raw JSON format.');
    return parseJsonResponse(rawResult);
  } catch (error) {
    logger.warn('Gemini quiz generation failed, using mock quiz fallback.');
    // Return high quality mock data so user can test quiz feature
    return Array.from({ length: count }, (_, i) => ({
      questionText: `Sample Question ${i + 1} from study materials? (AI API was offline)`,
      type: quizType,
      options: quizType === 'mcq' ? ['Option A (Correct)', 'Option B', 'Option C', 'Option D'] : [],
      correctAnswer: quizType === 'mcq' ? 'Option A (Correct)' : (quizType === 'true_false' ? 'true' : 'Answer'),
      explanation: 'This is a sample explanation generated because the Gemini API is in fallback mode.',
    }));
  }
};

/**
 * AI Generate Flashcards
 */
export const generateFlashcards = async (text, count = 8) => {
  const prompt = `You are a study helper. Extract exactly ${count} key concepts, vocabulary, or definitions from the text below.
Create a JSON array where each object has:
1. "front": string, a key term, question, or front of the card
2. "back": string, definition, formula, short answer, or explanation on the back of the card

You MUST output ONLY a valid JSON array, with no other text surrounding it. Do not include markdown code block tags.

Text:
${text.substring(0, 15000)}
`;

  try {
    const rawResult = await generateContent(prompt, 'You generate flashcards in raw JSON format.');
    return parseJsonResponse(rawResult);
  } catch (error) {
    logger.warn('Gemini flashcard generation failed, using mock fallback.');
    return Array.from({ length: count }, (_, i) => ({
      front: `AI Fallback Term ${i + 1}`,
      back: `Definition of fallback term ${i + 1}. Run with valid GEMINI_API_KEY to generate from actual document content.`,
    }));
  }
};

/**
 * AI Generate Study Planner
 */
export const generateStudyPlan = async (subjectsList, examDatesList) => {
  const subjectsStr = subjectsList.map(s => s.name).join(', ');
  const examsStr = examDatesList.map(e => `${e.examName} on ${e.examDate.toDateString()}`).join(', ');

  const prompt = `Create a weekly study plan scheduler.
Subjects to schedule: ${subjectsStr}
Upcoming exams: ${examsStr}

Generate exactly 5-8 specific tasks for the next 7 days.
You MUST output ONLY a valid JSON array of objects. Do not wrap in markdown tags.
Each object must have these fields:
1. "taskName": string, specific study task (e.g., "Review Calculus Chapter 3 Limits")
2. "description": string, what exact materials or practice to cover
3. "dueDate": string, ISO date format for a day within the next 7 days
4. "subjectId": string or null, if matchable to any input subjects

Subjects data for matching IDs:
${JSON.stringify(subjectsList.map(s => ({ id: s._id, name: s.name })))}
`;

  try {
    const rawResult = await generateContent(prompt, 'You are an academic counselor generating weekly planners in raw JSON.');
    return parseJsonResponse(rawResult);
  } catch (error) {
    logger.warn('Gemini study planner failed, using mock schedule fallback.');
    const today = new Date();
    return subjectsList.slice(0, 5).map((subject, index) => {
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + index + 1);
      return {
        taskName: `Review ${subject.name} Core Concepts`,
        description: `Perform an active recall session on the introductory and intermediate topics of ${subject.name}.`,
        dueDate: dueDate.toISOString(),
        subjectId: subject._id,
      };
    });
  }
};

/**
 * AI Document Chat Context Q&A
 */
export const chatWithDocument = async (chatHistory, documentText, question) => {
  const historyPrompt = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  
  const prompt = `You are a helpful study assistant. You are helping a student understand their uploaded notes.
Here is the text content extracted from their document:
--- START DOCUMENT TEXT ---
${documentText.substring(0, 20000)}
--- END DOCUMENT TEXT ---

Below is the chat history:
${historyPrompt}

Student: ${question}

Provide a helpful, detailed, and accurate answer based on the document text. If the answer cannot be found in the document, you may use your general knowledge, but clearly state that it is not explicitly mentioned in the notes. Format the response in clean Markdown.
`;

  try {
    return await generateContent(prompt);
  } catch (error) {
    logger.error(`Document chat AI call failed: ${error.message}`);
    return `*Sorry, I am having trouble connecting to my brain right now. Here is a local response to your question: "${question}". Please check your internet connection or Gemini API credentials.*`;
  }
};

/**
 * AI Explains a Concept
 */
export const explainConcept = async (concept, level = 'beginner') => {
  const prompt = `You are a master teacher. Explain the concept of "${concept}" to a student.
Target understanding level: ${level} (explain appropriately: simple terms for beginner, comprehensive with models for intermediate, advanced math/theorems for expert).
Include:
1. A simple definition
2. A real-world analogy (highly visual)
3. Step-by-step breakdown or equations if needed
4. A concrete examples/scenario
Format with clean Markdown, using tables, bullet points, and code blocks if appropriate.
`;

  try {
    return await generateContent(prompt);
  } catch (error) {
    logger.error(`Concept explanation failed: ${error.message}`);
    return `### Explanation of ${concept} (${level} level)\n\n*The AI engine is currently offline. Here is a placeholder explanation.*\n\n**${concept}** is a core concept. In simple terms, it represents an important topic in your syllabus. Please enable Gemini API to get a premium explanation.`;
  }
};
