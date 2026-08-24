/**
 * Simply Create KC — /submit Pages Function
 * Handles all contact/inquiry form submissions
 * Validates → Turnstile → Gmail via Google Service Account JWT
 *
 * CF Pages Secrets (set in CF Dashboard → Pages → simply-create → Settings → Env vars):
 *   GOOGLE_PRIVATE_KEY   — SA private key PEM (\n as literal \n)
 *   GOOGLE_CLIENT_EMAIL  — openclaw-agent@killergrowth.iam.gserviceaccount.com
 *   TURNSTILE_SECRET     — CF Turnstile secret key
 *   TO_EMAIL             — hello@simplycreatekc.com
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function onRequestPost({ request, env }) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid form data.' }), { status: 400, headers: JSON_HEADERS });
  }

  const get = (k) => (formData.get(k) || '').trim();

  const formType       = get('form_type') || 'general-contact';
  const name           = get('name');
  const email          = get('email');
  const phone          = get('phone');
  const message        = get('message');
  const turnstileToken = get('cf-turnstile-response');

  // Required field validation
  if (!name || !email) {
    return new Response(JSON.stringify({ ok: false, error: 'Name and email are required.' }), { status: 400, headers: JSON_HEADERS });
  }
  if (!email.includes('@') || !email.includes('.')) {
    return new Response(JSON.stringify({ ok: false, error: 'Please enter a valid email address.' }), { status: 400, headers: JSON_HEADERS });
  }

  // Domain blocklist
  const BLOCKED_DOMAINS = ['virtualhandsupport.com', 'toptalentvas.com', 'vas4hire.com', 'vettedvas.com'];
  const emailDomain = email.split('@')[1]?.toLowerCase().trim();
  if (BLOCKED_DOMAINS.includes(emailDomain)) {
    return new Response(JSON.stringify({ ok: false, error: 'Please enter a valid email address.' }), { status: 400, headers: JSON_HEADERS });
  }

  // Turnstile verification
  const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(env.TURNSTILE_SECRET)}&response=${encodeURIComponent(turnstileToken)}`,
  });
  const tsData = await tsRes.json();
  if (!tsData.success) {
    return new Response(JSON.stringify({ ok: false, error: 'Verification failed. Please try again.' }), { status: 400, headers: JSON_HEADERS });
  }

  // Build subject + label
  const formLabels = {
    'general-contact':    'General Contact',
    'private-event':      'Private Event Inquiry',
    'custom-piece':       'Custom Piece Inquiry',
    'artist-partnership': 'Artist Partnership Inquiry',
    'shop':               'Shop Inquiry',
  };
  const label = formLabels[formType] || 'Contact Form';
  const subject = `Simply Create KC — ${label}: ${name}`;

  // Collect extra fields (anything not in base set)
  const BASE_FIELDS = new Set(['name','email','phone','message','form_type','cf-turnstile-response']);
  const extraFields = [];
  for (const [key, val] of formData.entries()) {
    if (BASE_FIELDS.has(key) || !val.trim()) continue;
    extraFields.push({ key: key.replace(/_/g,' '), val: val.trim() });
  }

  const extraHtml = extraFields.map(({key, val}) =>
    `<div class="field"><label>${escHtml(titleCase(key))}</label><div class="value">${escHtml(val)}</div></div>`
  ).join('');

  const htmlBody = buildEmail({ label, name, email, phone, message, extraHtml, subject });

  try {
    const accessToken = await getGoogleAccessToken(env.GOOGLE_PRIVATE_KEY, env.GOOGLE_CLIENT_EMAIL);
    await sendGmail(accessToken, { to: env.TO_EMAIL, replyTo: email, replyToName: name, subject, body: htmlBody });
    return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
  } catch (err) {
    console.error('[simply-create/submit] Error:', err?.message);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to send. Please email us directly at hello@simplycreatekc.com.' }), {
      status: 500, headers: JSON_HEADERS,
    });
  }
}

// ── Email template ───────────────────────────────────────────────────

function buildEmail({ label, name, email, phone, message, extraHtml, subject }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:2px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .hd{background:#b5614a;padding:28px 32px}
  .hd-title{font-size:22px;font-weight:700;color:#fff;font-family:Georgia,serif}
  .badge{display:inline-block;background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border-radius:2px;margin-top:10px}
  .bd{padding:32px}
  .bd h2{font-size:18px;font-weight:700;color:#1e1e1e;margin:0 0 4px;font-family:Georgia,serif}
  .sub{font-size:13px;color:#888;margin:0 0 24px}
  .field{margin-bottom:18px}
  .field label{display:block;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#aaa;margin-bottom:4px}
  .value{font-size:15px;color:#1e1e1e;line-height:1.5}
  .value a{color:#b5614a;text-decoration:none}
  .msg{background:#faf7f2;padding:16px 18px;font-size:15px;color:#1e1e1e;line-height:1.7;white-space:pre-wrap;border-left:3px solid #b5614a}
  hr{border:none;border-top:1px solid #e8e2d9;margin:24px 0}
  .btn{display:inline-block;margin-top:20px;background:#b5614a;color:#fff!important;font-size:14px;font-weight:700;padding:12px 28px;border-radius:2px;text-decoration:none;letter-spacing:.05em}
  .ft{padding:20px 32px;background:#faf7f2;text-align:center;font-size:12px;color:#aaa}
  .ft a{color:#b5614a;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="hd">
    <div class="hd-title">Simply Create KC</div>
    <div class="badge">${escHtml(label)}</div>
  </div>
  <div class="bd">
    <h2>New Inquiry Received</h2>
    <p class="sub">Submitted via simplycreatekc.com</p>
    <div class="field"><label>Name</label><div class="value">${escHtml(name)}</div></div>
    <div class="field"><label>Email</label><div class="value"><a href="mailto:${escHtml(email)}">${escHtml(email)}</a></div></div>
    <div class="field"><label>Phone</label><div class="value">${phone ? escHtml(phone) : '—'}</div></div>
    ${extraHtml}
    ${message ? `<hr><div class="field"><label>Message</label><div class="msg">${escHtml(message)}</div></div>` : ''}
    <a href="mailto:${escHtml(email)}?subject=Re: ${encodeURIComponent(subject)}" class="btn">&#8594; Reply to ${escHtml(name.split(' ')[0])}</a>
  </div>
  <div class="ft">Sent from <a href="https://simplycreatekc.com">simplycreatekc.com</a></div>
</div>
</body></html>`;
}

// ── Helpers ──────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

async function getGoogleAccessToken(privateKeyPem, clientEmail) {
  const now = Math.floor(Date.now() / 1000);
  const b64url = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const header  = { alg:'RS256', typ:'JWT' };
  const payload = {
    iss: clientEmail,
    sub: 'tylerbrickley@killergrowth.com',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'')
    .replace(/\\n/g,'').replace(/\s+/g,'');
  const derBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', derBytes.buffer, { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const b64sig = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const jwt = `${signingInput}.${b64sig}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
  const data = await tokenRes.json();
  if (!data.access_token) throw new Error(`No access_token: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function sendGmail(accessToken, { to, replyTo, replyToName, subject, body }) {
  const replyToHeader = replyToName ? `${replyToName} <${replyTo}>` : replyTo;
  const mime = [
    `From: Simply Create KC <tylerbrickley@killergrowth.com>`,
    `To: ${to}`,
    `Reply-To: ${replyToHeader}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    body,
  ].join('\r\n');
  const mimeBytes = new TextEncoder().encode(mime);
  let binary = '';
  mimeBytes.forEach(b => binary += String.fromCharCode(b));
  const encoded = btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/tylerbrickley@killergrowth.com/messages/send', {
    method:'POST',
    headers:{ Authorization:`Bearer ${accessToken}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`);
  return res.json();
}
