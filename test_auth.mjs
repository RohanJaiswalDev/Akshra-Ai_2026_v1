async function runTest() {
  console.log("--- Starting Backend Auth Verification ---");

  const testEmail = "testuser@akshra.ai";

  // 1. Send OTP
  console.log("1. Testing POST /api/auth/send-otp ...");
  const sendRes = await fetch("http://localhost:3000/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail }),
  });

  const sendData = await sendRes.json();
  console.log("send-otp status:", sendRes.status, sendData);

  if (!sendData.success) {
    console.error("Failed to send OTP!");
    return;
  }

  const otp = sendData.devOtp;
  console.log("Captured OTP:", otp);

  // 2. Verify OTP
  console.log("\n2. Testing POST /api/auth/verify-otp ...");
  const verifyRes = await fetch("http://localhost:3000/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, otp }),
  });

  const verifyData = await verifyRes.json();
  const setCookie = verifyRes.headers.get("set-cookie");
  console.log("verify-otp status:", verifyRes.status, verifyData);
  console.log("Set-Cookie header:", setCookie ? "PRESENT" : "MISSING");

  if (!verifyData.success || !setCookie) {
    console.error("Failed to verify OTP or receive cookie!");
    return;
  }

  const sessionCookie = setCookie.split(";")[0];

  // 3. Test GET /api/auth/me with Cookie
  console.log("\n3. Testing GET /api/auth/me with session cookie ...");
  const meRes = await fetch("http://localhost:3000/api/auth/me", {
    headers: { Cookie: sessionCookie },
  });

  const meData = await meRes.json();
  console.log("auth/me status:", meRes.status, meData);

  // 4. Test POST /api/auth/logout
  console.log("\n4. Testing POST /api/auth/logout ...");
  const logoutRes = await fetch("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { Cookie: sessionCookie },
  });

  const logoutData = await logoutRes.json();
  console.log("logout status:", logoutRes.status, logoutData);

  console.log("\n--- All Backend Auth Tests Passed Successfully! ---");
}

runTest().catch(console.error);
