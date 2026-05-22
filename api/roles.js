const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KEY      = 'jobfit:roles';

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  // Use pipeline format for arbitrary-length JSON values
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['SET', key, JSON.stringify(value)]),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default async function handler(req, res) {
  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({
      error: 'Vercel KV not connected. Go to Vercel Dashboard → Storage → Create KV → connect to this project.',
    });
  }

  try {
    // GET /api/roles — return all tracked roles
    if (req.method === 'GET') {
      const roles = await kvGet(KEY);
      return res.status(200).json({ roles: roles || [] });
    }

    // POST /api/roles — action-based mutations
    if (req.method === 'POST') {
      const { action, role, id, patch } = req.body;
      let roles = (await kvGet(KEY)) || [];

      if (action === 'save') {
        // Upsert: update if exists, prepend if new
        if (!role || !role.id) return res.status(400).json({ error: 'role.id required' });
        const idx = roles.findIndex(r => r.id === role.id);
        if (idx >= 0) roles[idx] = { ...roles[idx], ...role };
        else roles.unshift(role);

      } else if (action === 'delete') {
        if (!id) return res.status(400).json({ error: 'id required' });
        roles = roles.filter(r => r.id !== id);

      } else if (action === 'update') {
        if (!id || !patch) return res.status(400).json({ error: 'id and patch required' });
        const idx = roles.findIndex(r => r.id === id);
        if (idx >= 0) roles[idx] = { ...roles[idx], ...patch };
        else return res.status(404).json({ error: 'Role not found' });

      } else {
        return res.status(400).json({ error: `Unknown action: ${action}` });
      }

      await kvSet(KEY, roles);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, roles });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
