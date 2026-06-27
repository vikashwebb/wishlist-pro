const DEFAULT_FORMSPREE_FORM_ID = "mbdeqdlq";

function getFormspreeEndpoint() {
  const customAction = process.env.FORMSPREE_FORM_ACTION?.trim();
  if (customAction) {
    return customAction;
  }

  const formId = process.env.FORMSPREE_FORM_ID?.trim() || DEFAULT_FORMSPREE_FORM_ID;
  return `https://formspree.io/f/${formId}`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function buildSupportContactSubject({ subject, reason, shopDomain }) {
  const trimmedSubject = subject?.trim();
  if (trimmedSubject) {
    return trimmedSubject;
  }

  const reasonText = reason?.trim() || "Support request";
  return `[WishMe] ${reasonText}${shopDomain ? ` — ${shopDomain}` : ""}`;
}

export async function submitSupportContact({
  shopDomain,
  reason,
  priority,
  name,
  email,
  subject,
  message,
  affectedArea,
  gotcha,
}) {
  if (gotcha?.trim()) {
    return { ok: true, skipped: true };
  }

  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim();
  const trimmedMessage = message?.trim();
  const trimmedReason = reason?.trim();
  const trimmedPriority = priority?.trim() || "Normal";
  const trimmedAffectedArea = affectedArea?.trim() || "";

  if (!trimmedReason) {
    throw new Error("Please choose what you need help with.");
  }

  if (!trimmedName) {
    throw new Error("Please enter your name.");
  }

  if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
    throw new Error("Please enter a valid reply-to email.");
  }

  if (!trimmedMessage) {
    throw new Error("Please describe your issue or question.");
  }

  const payload = {
    _subject: buildSupportContactSubject({
      subject,
      reason: trimmedReason,
      shopDomain,
    }),
    _replyto: trimmedEmail,
    name: trimmedName,
    email: trimmedEmail,
    reason: trimmedReason,
    priority: trimmedPriority,
    shop: shopDomain || "unknown",
    affected_area: trimmedAffectedArea,
    message: trimmedMessage,
  };

  const response = await fetch(getFormspreeEndpoint(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const formspreeError =
      typeof data.error === "string"
        ? data.error
        : Array.isArray(data.errors)
          ? data.errors.map((entry) => entry.message).filter(Boolean).join(" ")
          : "";

    console.error("support.contact.formspree.error", {
      status: response.status,
      data,
      shopDomain,
    });

    throw new Error(
      formspreeError ||
        "Could not deliver your message. Confirm the Formspree form is activated, then try again.",
    );
  }

  return { ok: true, id: data.id ?? null };
}
