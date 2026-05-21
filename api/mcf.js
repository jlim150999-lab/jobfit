export default async function handler(req, res) {
  const { search, limit = 20, page = 0 } = req.query;

  if (!search) return res.status(400).json({ error: 'search param required' });

  try {
    const response = await fetch(
      `https://api.mycareersfuture.gov.sg/v2/jobs?search=${encodeURIComponent(search)}&limit=${limit}&page=${page}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1800');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
