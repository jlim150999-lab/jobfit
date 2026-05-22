export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, jobTitle, company, jobDescription, question, answer } = req.body;
  if (!jobTitle || !jobDescription) {
    return res.status(400).json({ error: 'jobTitle and jobDescription are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const NELLIE_CONTEXT = `Candidate: Nellie — Product Marketing Analyst (~2 years + internships at Amazon Global Selling & Unilever SEAA). Skills: SQL, Power BI, B2B marketing, demand gen, GTM strategy, analytics. Target: Marketing Specialist / Growth Strategy / Strategy & Ops.`;

  try {
    let systemPrompt, userContent;

    if (action === 'feedback') {
      // Mock practice feedback
      systemPrompt = `You are an interview coach giving honest, constructive feedback on a candidate's answer.

${NELLIE_CONTEXT}

Assess the answer quality and return ONLY a valid JSON object — no markdown, no code fences:
{
  "rating": <integer 1-5>,
  "ratingLabel": <"Excellent" | "Good" | "Needs work" | "Weak" | "Missing the mark">,
  "strong": ["<1-3 things done well in this answer>"],
  "missing": ["<1-3 things missing or underdeveloped>"],
  "suggestedStructure": "<brief guidance on how to structure a stronger answer — e.g. 'Lead with the business context, then quantify the impact of your A/B test, then connect to this role's growth mandate'>",
  "sampleOpener": "<a strong one-sentence opener she could use to start her answer>"
}`;
      userContent = `INTERVIEW QUESTION: ${question}\n\nCANDIDATE'S ANSWER:\n${answer}`;

    } else {
      // Generate question bank (default action)
      systemPrompt = `You are an interview coach preparing a candidate for a specific role.

${NELLIE_CONTEXT}

Given a job description, generate a question bank tailored to this exact role. Return ONLY a valid JSON object — no markdown, no code fences:
{
  "generic": ["<3-5 behavioural/motivational questions specific to this role type and company — not generic 'tell me about yourself' unless clearly relevant>"],
  "technical": ["<3-5 questions testing the specific technical or domain skills this role requires — e.g. analytics, campaign setup, data tools, market sizing>"],
  "strategic": ["<3-5 questions testing strategic thinking, prioritisation, and judgement relevant to this specific role and industry>"]
}

Make every question specific to this JD — reference the actual responsibilities and requirements. Avoid generic questions that could apply to any marketing role.`;
      userContent = `ROLE: ${jobTitle} at ${company || 'company not specified'}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 5000)}`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 1500,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Claude API error ${response.status}: ${errText}` });
    }

    const data = await response.json();
    const textBlock = data.content.find(b => b.type === 'text');
    if (!textBlock) return res.status(502).json({ error: 'No text response from Claude' });

    let result;
    try {
      result = JSON.parse(textBlock.text.trim());
    } catch {
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else return res.status(502).json({ error: 'Failed to parse Claude response as JSON' });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
