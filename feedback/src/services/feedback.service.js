const Feedback = require("../models/feedback.model");
const Client = require("../../../client/src/models/client.model");

const VALID_STATUSES = ["pending", "read", "started", "completed", "rejected"];

exports.createFeedback = async (data) => {
  const message = data.feedbackMessage?.toString().trim();
  const clientId = data.clientId?.toString().trim();

  if (!message) {
    return {
      status: 400,
      body: { success: false, message: "feedbackMessage is required" },
    };
  }

  if (!clientId) {
    return {
      status: 400,
      body: { success: false, message: "clientId is required" },
    };
  }

  const feedback = await Feedback.create({
    date: data.date ? new Date(data.date) : new Date(),
    feedbackMessage: message,
    clientId,
    status: "pending",
  });

  return {
    status: 201,
    body: { success: true, message: "Feedback submitted", data: feedback },
  };
};

const enrichWithMobile = async (feedbacks) => {
  const clientIds = [...new Set(feedbacks.map((f) => f.clientId).filter(Boolean))];
  const clients = await Client.find(
    { _id: { $in: clientIds } },
    { mobileNumber: 1 },
  ).lean();
  const mobileMap = {};
  clients.forEach((c) => {
    mobileMap[c._id.toString()] = c.mobileNumber || "";
  });
  return feedbacks.map((f) => ({
    ...f.toObject(),
    clientMobileNumber: mobileMap[f.clientId] || "",
  }));
};

exports.getAllFeedbacks = async (filters = {}) => {
  const query = { softDelete: false };

  if (filters.status && VALID_STATUSES.includes(filters.status)) {
    query.status = filters.status;
  }
  if (filters.clientId) {
    query.clientId = filters.clientId.toString().trim();
  }

  const feedbacks = await Feedback.find(query).sort({ createdAt: -1 });
  const data = await enrichWithMobile(feedbacks);
  return { status: 200, body: { success: true, data } };
};

exports.getById = async (feedbackId) => {
  const feedback = await Feedback.findOne({
    _id: feedbackId,
    softDelete: false,
  });

  if (!feedback) {
    return {
      status: 404,
      body: { success: false, message: "Feedback not found" },
    };
  }

  return { status: 200, body: { success: true, data: feedback } };
};

exports.updateStatus = async (feedbackId, status) => {
  if (!VALID_STATUSES.includes(status)) {
    return {
      status: 400,
      body: {
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      },
    };
  }

  const feedback = await Feedback.findOneAndUpdate(
    { _id: feedbackId, softDelete: false },
    { status, $push: { updatedAt: new Date() } },
    { new: true, runValidators: true },
  );

  if (!feedback) {
    return {
      status: 404,
      body: { success: false, message: "Feedback not found" },
    };
  }

  return {
    status: 200,
    body: { success: true, message: "Feedback status updated", data: feedback },
  };
};

exports.deleteFeedback = async (feedbackId) => {
  const feedback = await Feedback.findOneAndUpdate(
    { _id: feedbackId, softDelete: false },
    { softDelete: true, $push: { updatedAt: new Date() } },
    { new: true },
  );

  if (!feedback) {
    return {
      status: 404,
      body: { success: false, message: "Feedback not found" },
    };
  }

  return {
    status: 200,
    body: { success: true, message: "Feedback moved to trash" },
  };
};

exports.getTrashFeedbacks = async () => {
  const feedbacks = await Feedback.find({ softDelete: true }).sort({
    createdAt: -1,
  });
  const data = await enrichWithMobile(feedbacks);
  return { status: 200, body: { success: true, data } };
};

exports.restoreFeedback = async (feedbackId) => {
  const feedback = await Feedback.findOneAndUpdate(
    { _id: feedbackId, softDelete: true },
    { softDelete: false, $push: { updatedAt: new Date() } },
    { new: true },
  );

  if (!feedback) {
    return {
      status: 404,
      body: { success: false, message: "Feedback not found in trash" },
    };
  }

  return {
    status: 200,
    body: { success: true, message: "Feedback restored", data: feedback },
  };
};

exports.hardDeleteFeedback = async (feedbackId) => {
  const feedback = await Feedback.findOneAndDelete({
    _id: feedbackId,
    softDelete: true,
  });

  if (!feedback) {
    return {
      status: 404,
      body: { success: false, message: "Feedback not found in trash" },
    };
  }

  return {
    status: 200,
    body: { success: true, message: "Feedback permanently deleted" },
  };
};
