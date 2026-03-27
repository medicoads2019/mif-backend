const ContactUs = require("../models/contact.model");

const normalizePayload = (data = {}) => ({
  mobileNumber: data.mobileNumber?.toString().trim() || "",
  emailAddress: data.emailAddress?.toString().trim().toLowerCase() || "",
  whatsappNumber: data.whatsappNumber?.toString().trim() || "",
});

const validatePayload = (payload) => {
  if (
    !payload.mobileNumber &&
    !payload.emailAddress &&
    !payload.whatsappNumber
  ) {
    return "At least one contact field is required";
  }
  return null;
};

exports.createContact = async (data) => {
  const payload = normalizePayload(data);
  const validationMessage = validatePayload(payload);

  if (validationMessage) {
    return {
      status: 400,
      body: { success: false, message: validationMessage },
    };
  }

  const orderIndex = await ContactUs.countDocuments({ softDelete: false });

  const contact = await ContactUs.create({
    ...payload,
    orderIndex,
    createdBy: data.createdBy || null,
  });

  return {
    status: 201,
    body: {
      success: true,
      message: "Contact Us record created",
      data: contact,
    },
  };
};

exports.getAllContacts = async () => {
  const contacts = await ContactUs.find({ softDelete: false }).sort({
    orderIndex: 1,
    createdAt: 1,
  });
  return { status: 200, body: { success: true, data: contacts } };
};

exports.getById = async (contactId) => {
  const contact = await ContactUs.findOne({
    _id: contactId,
    softDelete: false,
  });

  if (!contact) {
    return {
      status: 404,
      body: { success: false, message: "Contact Us record not found" },
    };
  }

  return { status: 200, body: { success: true, data: contact } };
};

exports.updateContact = async (contactId, data) => {
  const existing = await ContactUs.findOne({
    _id: contactId,
    softDelete: false,
  });

  if (!existing) {
    return {
      status: 404,
      body: { success: false, message: "Contact Us record not found" },
    };
  }

  const payload = normalizePayload({
    mobileNumber: data.mobileNumber ?? existing.mobileNumber,
    emailAddress: data.emailAddress ?? existing.emailAddress,
    whatsappNumber: data.whatsappNumber ?? existing.whatsappNumber,
  });
  const validationMessage = validatePayload(payload);

  if (validationMessage) {
    return {
      status: 400,
      body: { success: false, message: validationMessage },
    };
  }

  const contact = await ContactUs.findByIdAndUpdate(
    contactId,
    { ...payload, $push: { updatedAt: new Date() } },
    { new: true, runValidators: true },
  );

  return {
    status: 200,
    body: {
      success: true,
      message: "Contact Us record updated",
      data: contact,
    },
  };
};

exports.deleteContact = async (contactId) => {
  const contact = await ContactUs.findByIdAndUpdate(
    contactId,
    { softDelete: true, $push: { updatedAt: new Date() } },
    { new: true },
  );

  if (!contact) {
    return {
      status: 404,
      body: { success: false, message: "Contact Us record not found" },
    };
  }

  return {
    status: 200,
    body: { success: true, message: "Contact Us record deleted" },
  };
};

exports.reorderContacts = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      status: 400,
      body: { success: false, message: "items array is required" },
    };
  }

  const operations = items.map(({ contactUsId, orderIndex }) =>
    ContactUs.findByIdAndUpdate(contactUsId, {
      orderIndex,
      $push: { updatedAt: new Date() },
    }),
  );

  await Promise.all(operations);

  return {
    status: 200,
    body: { success: true, message: "Contact Us order updated" },
  };
};
