export function formatCustomerIdLabel(customerOrId) {
  const id =
    typeof customerOrId === "string" ? customerOrId : customerOrId?.id ?? "";
  if (!id) return "Unknown customer";

  const match = id.match(/Customer\/(\d+)/);
  return match ? `Customer #${match[1]}` : id;
}

export function formatCustomerLabel(customer) {
  if (!customer) return "No customer selected";
  return formatCustomerIdLabel(customer.id);
}
