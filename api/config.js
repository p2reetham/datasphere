// /api/config — a tiny global JSON store for the site's editable content
// (Google Form link, gallery photos, mission/about text), backed by a
// single config.json file in a GitHub repo.
//
// GITHUB_TOKEN and ADMIN_PASSWORD live only in Vercel's environment
// variables (Project Settings -> Environment Variables). They are read
// here, on the server, and are never sent to the browser.

const GH_API = 'https://api.github.com';

function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'data-sphere-club-site',
  };
}

function repoInfo() {
  const { GITHUB_OWNER, GITHUB_REPO } = process.env;
  const path = process.env.GITHUB_PATH || 'config.json';
  const branch = process.env.GITHUB_BRANCH || 'main';
  return { GITHUB_OWNER, GITHUB_REPO, path, branch };
}

async function getFile() {
  const { GITHUB_OWNER, GITHUB_REPO, path, branch } = repoInfo();
  const url = `${GH_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${branch}`;

  const metaRes = await fetch(url, { headers: ghHeaders() });
  if (metaRes.status === 404) return { sha: null, data: null };
  if (!metaRes.ok) throw new Error('GitHub read failed: ' + metaRes.status);
  const meta = await metaRes.json();

  // Files under 1MB come back with base64 content inlined already.
  if (meta.content) {
    const content = Buffer.from(meta.content, 'base64').toString('utf-8');
    return { sha: meta.sha, data: JSON.parse(content) };
  }

  // Bigger files (a gallery with several photos gets here fast) omit
  // "content" from the JSON response above — fetch the raw bytes instead.
  const rawRes = await fetch(url, {
    headers: { ...ghHeaders(), Accept: 'application/vnd.github.raw' },
  });
  if (!rawRes.ok) throw new Error('GitHub raw read failed: ' + rawRes.status);
  const text = await rawRes.text();
  return { sha: meta.sha, data: JSON.parse(text) };
}

async function putFile(newData, sha) {
  const { GITHUB_OWNER, GITHUB_REPO, path, branch } = repoInfo();
  const url = `${GH_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const body = {
    message: 'Update site config',
    content: Buffer.from(JSON.stringify(newData, null, 2)).toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('GitHub write failed: ' + res.status + ' ' + t);
  }
  return res.json();
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { data } = await getFile();
      res.status(200).json({ config: data });
      return;
    }

    if (req.method === 'POST') {
      const { password, config, verify } = req.body || {};
      const ok = !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
      if (!ok) {
        res.status(401).json({ error: 'Incorrect password' });
        return;
      }
      if (verify) {
        res.status(200).json({ ok: true });
        return;
      }
      const { sha } = await getFile();
      await putFile(config, sha);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
