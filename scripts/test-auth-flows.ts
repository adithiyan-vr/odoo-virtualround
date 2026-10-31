async function test() {
  console.log('Testing Health...');
  const h = await fetch('http://localhost:3000/api/v1/health');
  console.log('Health:', h.status, await h.json());

  // Test 1: Login with Admin@12345
  console.log('\nTesting Login with Admin@12345...');
  const l1 = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@brightloop.io', password: 'Admin@12345' }),
  });
  console.log('Status:', l1.status);
  console.log('Body:', await l1.json());
  console.log('Set-Cookie:', l1.headers.get('set-cookie'));

  // Test 2: Login with Admin#12345 (the demo fill button password)
  console.log('\nTesting Login with Admin#12345 (demo fill button)...');
  const l2 = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@brightloop.io', password: 'Admin#12345' }),
  });
  console.log('Status:', l2.status);
  console.log('Body:', await l2.json());

  // Test 3: Signup with valid password
  const uniqueEmail = `test_signup_${Date.now()}@brightloop.io`;
  console.log('\nTesting Signup with new user:', uniqueEmail);
  const s1 = await fetch('http://localhost:3000/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Signup Test User',
      email: uniqueEmail,
      password: 'SecurePassword123!',
    }),
  });
  console.log('Signup Status:', s1.status);
  const s1Json = await s1.json();
  console.log('Signup Body:', s1Json);
  const cookie = s1.headers.get('set-cookie');
  console.log('Signup Cookie:', cookie);

  if (s1.ok) {
    // Test 4: Auth me with the cookie
    console.log('\nTesting GET /auth/me with session cookie...');
    const match = cookie?.match(/bl_session=([^;]+)/);
    const meRes = await fetch('http://localhost:3000/api/v1/auth/me', {
      headers: { Cookie: `bl_session=${match ? match[1] : ''}` },
    });
    console.log('Me Status:', meRes.status);
    console.log('Me Body:', await meRes.json());
  }

  // Test 5: Signup with failing password (e.g. 8 chars)
  console.log('\nTesting Signup with short password...');
  const s2 = await fetch('http://localhost:3000/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bad Pass User',
      email: `bad_pass_${Date.now()}@brightloop.io`,
      password: 'Short1!',
    }),
  });
  console.log('Short Pass Status:', s2.status);
  console.log('Short Pass Body:', await s2.json());
}

test().catch(console.error);
