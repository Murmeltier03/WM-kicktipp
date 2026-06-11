function isValidPassword(password: unknown) {
  const configuredPassword = process.env.ADMIN_PASSWORD ?? "";
  return (
    typeof password === "string" &&
    password.trim().length > 0 &&
    configuredPassword.length > 0 &&
    password.trim() === configuredPassword
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: "ADMIN_PASSWORD is not configured" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;

  if (!isValidPassword(body?.password)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.status(200).json({ ok: true });
}
