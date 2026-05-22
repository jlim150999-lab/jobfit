const MODEL = 'google/gemini-1.5-flash';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, jobTitle, company, jobDescription, question, answer } = req.body;
  if (!jobTitle || !jobDescription) {
    return res.status(400).json({ error: 'jobTitle and jobDescription are required' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });

  const NELLIE_CONTEXT = `Candidate: Nellie — Product Marketing Analyst (~2 years + internships at Amazon Global Selling & Unilever SEAA). Skills: SQL, Power BI, B2B marketing, demand gen, GTM strategy, analytics. Target: Marketing Specialist / Growth Strategy / Strategy & Ops.`;

  let systemPrompt, userContent;

  if (action === 'feedback') {
    systemPrompt = `You are an interview coach giving honest, constructive feedback on a candidate's answer.

${NELLIE_CONTEXT}

Assess the answer quality and return ONLY a valid JSON object — no markdown, no code fences:
{
  "rating": <integer 1-5>,
  "ratingLabel": <"Excellent" | "Good" | "Needs work" | "Weak" | "Missing the mark">,
  "strong": ["<1-3 things done well in this answer>"],
  "missing": ["<1-3 things missing or underdeveloped>"],
  "suggestedStructure": "<brief guidance on how to structure a stronger answer>",
  "sampleOpener": "<a strong one-sentence opener she could use to start her answer>"
}`;
    userContent = `INTERVIEW QUESTION: ${question}\n\nCANDIDATE'S ANSWER:\n${answer}`;

  } else {
    systemPrompt = `You are an interview coach preparing a candidate for a specific role.

${NELLIE_CONTEXT}

Given a job description, generate a tailored question bank. Return ONLY a valid JSON object — no markdown, no code fences:
{
  "generic": ["<3-5 behavioural/motivational questions specific to this role and company>"],
  "technical": ["<3-5 questions testing the specific technical or domain skills this role requires>"],
  "strategic": ["<3-5 questions testing strategic thinking and judgement relevant to this role>"]
}

Make every question specific to this JD — reference actual responsibilities and requirements. Avoid generic questions that could apply to any marketing role.`;
    userContent = `ROLE: ${jobTitle} at ${company || 'company not specified'}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 5000)}`;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://jobfit-steel.vercel.app',
        'X-Title': 'JobFit',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `AI API error ${response.status}: ${errText}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: 'No response from AI' });

    let result;
    try {
      result = JSON.parse(content.trim());
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else return res.status(502).json({ error: 'Failed to parse AI response as JSON' });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
