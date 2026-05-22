const MODEL = 'google/gemini-flash-1.5';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jobTitle, company, jobDescription, cvText } = req.body;
  if (!jobDescription || !cvText) {
    return res.status(400).json({ error: 'jobDescription and cvText are required' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });

  const NELLIE_PROFILE = `Candidate: Nellie — Product Marketing Analyst (~2 years exp + 1 year internships at Amazon Global Selling & Unilever SEAA). Target: Marketing Specialist / Growth Strategy / Strategy & Ops roles in Tech/SaaS, eCommerce, fintech, FMCG. Skills: SQL, Excel, Power BI, Domo, Adobe Analytics, B2B marketing, demand gen, Pardot, market research, go-to-market strategy.`;

  const systemPrompt = `You are an expert CV coach helping a candidate tailor their CV for a specific job.

${NELLIE_PROFILE}

You will be given a target job description and the candidate's current CV text.

Analyse the CV against the job requirements and return ONLY a valid JSON object — no markdown, no code fences:
{
  "overallFit": "<2-sentence honest assessment of how well the CV positions her for this role>",
  "strengths": ["<2-4 things in her CV already well-aligned to this role's requirements — be specific>"],
  "gaps": ["<2-4 things missing or under-represented in her CV relative to what this role needs>"],
  "tweaks": ["<3-5 specific, actionable CV edits — e.g. 'Move your Power BI bullet to the top of the UPS role and quantify: X dashboards built for Y stakeholders', 'Add a brief mention of A/B testing results to your Amazon internship'>"],
  "headline": "<a tailored one-line profile summary (max 20 words) optimised for this specific role>"
}

Be concrete and actionable — reference actual content from the CV and actual requirements from the JD.`;

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
          { role: 'user', content: `TARGET ROLE: ${jobTitle} at ${company || 'company not specified'}\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 5000)}\n\n---\n\nMY CV:\n${cvText.slice(0, 8000)}` },
        ],
        response_format: { type: 'json_object' },
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
