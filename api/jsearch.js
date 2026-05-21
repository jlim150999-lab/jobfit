export default async function handler(req, res) {
  const { query, page = 1 } = req.query;

  if (!query) return res.status(400).json({ error: 'query param required' });

  try {
    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=${page}&num_pages=2`,
      {
        headers: {
          'X-RapidAPI-Key':  process.env.JSEARCH_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      }
    );
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
