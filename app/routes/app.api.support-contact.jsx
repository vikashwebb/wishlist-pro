import { json } from "../models/wishlist.server";
import { submitSupportContact } from "../models/support-contact.server";

export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    const result = await submitSupportContact({
      shopDomain: session.shop,
      reason: formData.get("reason")?.toString(),
      priority: formData.get("priority")?.toString(),
      name: formData.get("name")?.toString(),
      email: formData.get("email")?.toString(),
      subject: formData.get("subject")?.toString(),
      message: formData.get("message")?.toString(),
      affectedArea: formData.get("affectedArea")?.toString(),
      gotcha: formData.get("_gotcha")?.toString(),
    });

    return json({ ok: true, ...result });
  } catch (error) {
    console.error("support.contact.action.error", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send your message. Please try again.",
      },
      { status: 422 },
    );
  }
};
