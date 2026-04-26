const mongoose = global.mongoose || require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    feedbackMessage: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "read", "started", "completed", "rejected"],
      default: "pending",
    },
    clientId: { type: String, required: true, trim: true },
    softDelete: { type: Boolean, default: false },
    updatedAt: [{ type: Date }],
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    collection: "feedbacks",
  },
);

feedbackSchema.set("toJSON", { virtuals: true });
feedbackSchema.set("toObject", { virtuals: true });
feedbackSchema.virtual("feedbackId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("Feedback", feedbackSchema);
