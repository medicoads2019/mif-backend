const mongoose = global.mongoose || require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    orderIndex: { type: Number, default: 0 },
    mobileNumber: { type: String, default: "", trim: true },
    emailAddress: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    whatsappNumber: { type: String, default: "", trim: true },
    softDelete: { type: Boolean, default: false },
    createdBy: { type: String, default: null },
    updatedAt: [{ type: Date }],
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    collection: "contact_us",
  },
);

contactSchema.set("toJSON", { virtuals: true });
contactSchema.set("toObject", { virtuals: true });
contactSchema.virtual("contactUsId").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("ContactUs", contactSchema);
