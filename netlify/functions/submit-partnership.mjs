const COMPANY_NAME = "TIAN YI INTERNATIONAL TRADING PTE. LTD";
const DEFAULT_EMAIL_TO = "tianyi011224@gmail.com";
const MAX_FIELD_LENGTH = 500;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeField(value) {
  return String(value || "").trim().slice(0, MAX_FIELD_LENGTH);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createApplication(payload) {
  const applicationType =
    payload.applicationType === "supplier" ? "supplier" : "customer";
  const application = {
    applicationType,
    companyName: normalizeField(payload.companyName),
    companyType: normalizeField(payload.companyType),
    supplierCategory: normalizeField(payload.supplierCategory),
    address: normalizeField(payload.address),
    contactName: normalizeField(payload.contactName),
    phone: normalizeField(payload.phone),
    monthlyPurchase: normalizeField(payload.monthlyPurchase),
    supplyRegion: normalizeField(payload.supplyRegion),
    email: normalizeField(payload.email),
    submittedAt: new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Singapore",
    }),
  };

  const typeSpecificValue =
    applicationType === "customer"
      ? application.companyType && application.monthlyPurchase
      : application.supplierCategory && application.supplyRegion;

  if (
    !application.companyName ||
    !application.address ||
    !application.contactName ||
    !application.phone ||
    !application.email ||
    !typeSpecificValue
  ) {
    return { error: "Missing required application details" };
  }

  if (!isValidEmail(application.email)) {
    return { error: "Invalid email address" };
  }

  return { application };
}

function createEmailHtml(application) {
  const isCustomer = application.applicationType === "customer";
  const rows = [
    ["申请类型", isCustomer ? "客户合作申请" : "供应商合作申请"],
    ["提交时间（新加坡）", application.submittedAt],
    ["公司名称", application.companyName],
    [isCustomer ? "公司类型" : "供应品类", isCustomer ? application.companyType : application.supplierCategory],
    ["地址", application.address],
    ["联系人", application.contactName],
    ["电话号码", application.phone],
    [isCustomer ? "月采购金额" : "可供应区域", isCustomer ? application.monthlyPurchase : application.supplyRegion],
    ["电子邮箱", application.email],
  ];

  return `<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;background:#f4f7f5;font-family:Arial,'Microsoft YaHei',sans-serif;color:#17231d;">
    <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
      <div style="background:#ffffff;border:1px solid #e1e8e4;padding:30px;">
        <p style="margin:0 0 8px;color:#0eaa61;font-weight:700;">${COMPANY_NAME}</p>
        <h1 style="margin:0 0 24px;font-size:24px;">${isCustomer ? "新的客户合作申请" : "新的供应商合作申请"}</h1>
        <table style="border-collapse:collapse;width:100%;">
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <th style="border-top:1px solid #e5ebe8;padding:12px 10px;text-align:left;width:34%;font-size:14px;">${escapeHtml(label)}</th>
                  <td style="border-top:1px solid #e5ebe8;padding:12px 10px;font-size:14px;line-height:1.6;">${escapeHtml(value)}</td>
                </tr>`,
            )
            .join("")}
        </table>
      </div>
    </div>
  </body>
</html>`;
}

async function sendApplicationEmail(application) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured" };
  }

  const from =
    process.env.PARTNERSHIP_EMAIL_FROM ||
    process.env.ORDER_EMAIL_FROM ||
    "onboarding@resend.dev";
  const to =
    process.env.PARTNERSHIP_EMAIL_TO ||
    process.env.ORDER_EMAIL_TO ||
    DEFAULT_EMAIL_TO;
  const applicationLabel =
    application.applicationType === "customer" ? "客户合作申请" : "供应商合作申请";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: application.email,
      subject: `${COMPANY_NAME} - 新的${applicationLabel} - ${application.companyName}`,
      html: createEmailHtml(application),
    }),
  });

  if (!response.ok) {
    return { sent: false, reason: await response.text() };
  }

  const result = await response.json();
  return { sent: true, id: result.id };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const payload = JSON.parse(event.body || "{}");

    // 蜜罐字段有内容时按成功处理，避免向自动提交程序暴露拦截规则。
    if (normalizeField(payload["bot-field"])) {
      return jsonResponse(200, { sent: true });
    }

    const normalized = createApplication(payload);
    if (normalized.error) {
      return jsonResponse(400, { error: normalized.error });
    }

    const email = await sendApplicationEmail(normalized.application);
    if (!email.sent) {
      return jsonResponse(502, {
        error: "Could not send partnership application email",
        detail: email.reason,
      });
    }

    return jsonResponse(200, { sent: true, emailId: email.id });
  } catch (error) {
    return jsonResponse(500, {
      error: "Could not submit partnership application",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
