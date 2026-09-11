// End-to-end verification of the BIS Sahayak stack against a running
// Postgres + AI service + Node API. Usage: node scripts/verify-api.mjs
// Assumes: postgres seeded, AI service on :8000, node-api on :4000.
const AI = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const API = process.env.API_URL ?? "http://localhost:4000/api/v1";

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function j(url, options) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, body };
}

async function main() {
  console.log("== BIS Sahayak end-to-end verification ==\n");

  console.log("[1] Health");
  const aiHealth = await j(`${AI}/health`);
  check("AI service /health ok", aiHealth.status === 200 && aiHealth.body?.ok !== false, JSON.stringify(aiHealth.body));
  const apiHealth = await j(`${API.replace("/api/v1", "")}/health`);
  check("Node API /health ok", apiHealth.status === 200, JSON.stringify(apiHealth.body));

  console.log("\n[2] Auth");
  const email = `verify-${Date.now()}@example.com`;
  const reg = await j(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123", role: "business", businessName: "Verify Co" }),
  });
  check("register returns 201 + JWT", reg.status === 201 && !!reg.body?.token, JSON.stringify(reg.body).slice(0, 200));
  const token = reg.body?.token;
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  console.log("\n[3] Applicability Engine");
  const kettle = await j(`${API}/applicability/check`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ productDescription: "I manufacture electric kettles for household use, rated 230V" }),
  });
  check("kettle check returns 200", kettle.status === 200);
  check(
    "kettle maps to IS 302 (Part 2/Sec 15)",
    kettle.body?.standards?.some((s) => s.is_number === "IS 302 (Part 2/Sec 15)"),
    JSON.stringify(kettle.body?.standards?.slice(0, 2)),
  );
  check("kettle is mandatory via QCO", kettle.body?.mandatory === true && kettle.body?.qcoRefs?.length > 0);

  const plywood = await j(`${API}/applicability/check`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ productDescription: "we sell marine plywood sheets" }),
  });
  check("plywood matched to IS 710 or IS 303", plywood.body?.standards?.[0]?.is_number === "IS 710" || plywood.body?.standards?.[0]?.is_number === "IS 303", plywood.body?.standards?.[0]?.is_number);
  check("plywood not flagged mandatory", plywood.body?.mandatory === false);

  console.log("\n[4] Citation-grounded chat");
  const session = await j(`${API}/chat/sessions`, { method: "POST", headers: auth, body: "{}" });
  check("chat session created", session.status === 201 && !!session.body?.id);
  const answer = await j(`${API}/chat/sessions/${session.body.id}/messages`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ content: "Do I need BIS certification to sell electric kettles in India?" }),
  });
  check("chat answer returns 201", answer.status === 201, JSON.stringify(answer.body).slice(0, 200));
  check("answer carries citations", (answer.body?.citations ?? []).length > 0);

  const refusal = await j(`${API}/chat/sessions/${session.body.id}/messages`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ content: "unicorn saddle certification requirements on planet Mars" }),
  });
  check("off-corpus query refuses honestly", refusal.body?.grounded === false && refusal.body?.citations?.length === 0, JSON.stringify(refusal.body).slice(0, 150));

  console.log("\n[5] QCO feed");
  const feed = await j(`${API}/qco/feed?pageSize=50`);
  check("feed returns items", feed.status === 200 && feed.body?.items?.length >= 10, `got ${feed.body?.items?.length}`);
  const electrical = feed.body.items.find((i) => i.title.includes("Electrical Appliances"));
  check("electrical appliances QCO 2026 present with 2026-10-01", electrical?.effective_date === "2026-10-01");

  console.log("\n[6] Verification lookup");
  const verify = await j(`${API}/verify/cml/${encodeURIComponent("CM/L-8200123456")}`);
  check("CM/L sample resolves", verify.status === 200 && verify.body?.record?.holderName === "Suvidha Appliances Pvt. Ltd.");
  const verify404 = await j(`${API}/verify/cml/${encodeURIComponent("CM/L-0000000000")}`);
  check("unknown CM/L returns 404", verify404.status === 404);
  const huid = await j(`${API}/verify/huid/AN0267`);
  check("HUID sample resolves", huid.status === 200 && huid.body?.record?.status === "active");

  console.log("\n[7] Watches");
  const watch = await j(`${API}/watches`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ productCategory: "household electrical appliances" }),
  });
  check("watch created", watch.status === 201 || watch.status === 409, JSON.stringify(watch.body));
  const dup = await j(`${API}/watches`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ productCategory: "household electrical appliances" }),
  });
  check("duplicate watch rejected 409", dup.status === 409);

  console.log("\n[8] Complaint copilot");
  const complaint = await j(`${API}/complaints`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      productDescription: "pressure cooker lid burst while cooking, ISI mark CM/L-8200123456 on the box",
      defectDescription: "The lid gasket failed and steam scalded my hand; safety plug did not release",
    }),
  });
  check("complaint drafted", complaint.status === 201 && !!complaint.body?.complaint?.draft?.body, JSON.stringify(complaint.body).slice(0, 150));
  check("complaint cites the matched standard", (complaint.body?.citations ?? []).length > 0);
  const submit = await j(`${API}/complaints/${complaint.body.complaint.id}/submit`, { method: "PATCH", headers: auth });
  check("complaint submitted", submit.status === 200 && submit.body?.status === "submitted");

  console.log(`\n== Result: ${passed} passed, ${failed} failed ==`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("verification crashed:", err.message);
  process.exit(1);
});
