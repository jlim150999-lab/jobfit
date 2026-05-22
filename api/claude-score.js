export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jobTitle, company, jobDescription } = req.body;
  if (!jobTitle || !jobDescription) {
    return res.status(400).json({ error: 'jobTitle and jobDescription are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const NELLIE_PROFILE = `CANDIDATE — Nellie
Current Role: Product Marketing Analyst, UPS Supply Chain Solutions (Oct 2024–present)
Prior Experience: Amazon Global Selling (6-month internship), Unilever SEAA (6-month internship)
Total Experience: ~2 years full-time + 1 year internships (generalist marketing/ops/analytics)
Available to Start: Immediately after 29 May 2026
Target Roles: Marketing Specialist, Growth Strategy Associate, Strategy & Operations Executive
Target Industries: Tech/SaaS, eCommerce, fintech, FMCG — high-growth environments preferred
Salary Target: SGD $4,800–$5,000/month (currently $4,200/mo, seeking ≥15% increment)
Hard Deal-breakers: Pure execution/admin roles with zero strategy; logistics/supply chain/heavy industry; East/North/North-East Singapore offices (Tampines, Bedok, Changi, Woodlands, Yishun, Sengkang, Punggol, Hougang, Serangoon, Ang Mo Kio etc.)
Technical Skills: SQL, Excel (Pivot Tables, Power Query), Power BI, Domo, Adobe Analytics, data visualisation, funnel analysis, A/B testing
Marketing Skills: B2B marketing, demand generation, Pardot, campaign execution, market research, competitive analysis, go-to-market strategy
Soft Skills: stakeholder management, cross-functional collaboration, project coordination, presenting to senior leadership`;

  const systemPrompt = `You are a career advisor giving honest, specific job fit assessments.

${NELLIE_PROFILE}

Given a job title and description, assess the candidate's fit. Return ONLY a valid JSON object — no markdown, no code fences, no preamble. Exactly these fields:
{
  "score": <integer 0-100>,
  "verdict": <"Excellent Match" | "Strong Match" | "Possible Match" | "Weak Match" | "Poor Match">,
  "summary": <2-3 sentences: honest assessment of overall fit, referencing specific role requirements and her background>,
  "strengths": [<2-4 concrete reasons this is a good fit — reference her actual experience, not generic statements>],
  "gaps": [<1-3 specific gaps or concerns — use empty array [] if there are genuinely none>],
  "highlight": [<2-3 specific things she should lead with in a cover letter or application for THIS role — e.g. "Lead with your Power BI dashboard work at UPS to show data-driven marketing" — draw from her actual background>],
  "tweak": [<1-3 specific reframes or things to address — e.g. "Reframe your UPS role as cross-functional stakeholder management, not logistics", "Don't over-emphasise supply chain context" — practical and honest>]
}

Scoring calibration:
85-100 Excellent Match — strong alignment on role type, seniority level, industry, and core skills
70-84  Strong Match    — mostly aligned with only minor gaps or stretch areas
50-69  Possible Match  — some alignment but notable gaps, mismatched seniority, or industry mismatch
30-49  Weak Match      — significant misalignment; role is too senior, wrong function, or wrong industry
0-29   Poor Match      — deal-breakers present or fundamentally wrong fit

Be honest and specific. Reference actual requirements from the JD and actual experience from her profile.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Job Title: ${jobTitle}\nCompany: ${company || 'Not specified'}\n\nJob Description:\n${jobDescription.slice(0, 6000)}`,
        }],
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
      // Fallback: extract JSON object if there's surrounding text
      const match = textBlock.text.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        return res.status(502).json({ error: 'Failed to parse Claude response as JSON' });
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
