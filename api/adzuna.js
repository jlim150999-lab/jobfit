export default async function handler(req, res) {
  const { what, page = 1 } = req.query;

  if (!what) return res.status(400).json({ error: 'what param required' });

  try {
    const response = await fetch(
      `https://api.adzuna.com/v1/api/jobs/sg/search/${page}?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_KEY}&what=${encodeURIComponent(what)}&results_per_page=30&content-type=application/json`
    );
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
