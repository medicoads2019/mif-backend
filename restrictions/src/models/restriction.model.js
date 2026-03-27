const mongoose = global.mongoose || require("mongoose");

const pagePermSchema = new mongoose.Schema(
  {
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false },
);

const viewOnlySchema = new mongoose.Schema(
  { view: { type: Boolean, default: false } },
  { _id: false },
);

const restrictionSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "SUPER_HR",
        "HR",
        "MARKETING",
        "MODERATOR",
        "USER",
      ],
    },
    permissions: {
      dashboard: { type: viewOnlySchema, default: () => ({}) },
      festivals: { type: pagePermSchema, default: () => ({}) },
      categorys: { type: pagePermSchema, default: () => ({}) },
      businesss: { type: pagePermSchema, default: () => ({}) },
      banners: { type: pagePermSchema, default: () => ({}) },
      demoFrames: { type: pagePermSchema, default: () => ({}) },
      businessFrames: { type: pagePermSchema, default: () => ({}) },
      clientFrames: { type: pagePermSchema, default: () => ({}) },
      clients: { type: pagePermSchema, default: () => ({}) },
      employees: { type: pagePermSchema, default: () => ({}) },
      contactUs: { type: pagePermSchema, default: () => ({}) },
      legalContent: { type: pagePermSchema, default: () => ({}) },
      imageDownload: { type: viewOnlySchema, default: () => ({}) },
    },
  },
  { timestamps: false, versionKey: false },
);

module.exports = mongoose.model("Restriction", restrictionSchema);
