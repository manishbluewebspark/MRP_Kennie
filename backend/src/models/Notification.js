import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },

  // Who receives this notification
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }], // send to multiple roles

  type: { type: String, enum: ["info", "warning", "alert"], default: "info" },
  isRead: { type: Boolean, default: false },

  // Optional link (for frontend navigation)
  link: { type: String },

  // Optional meta info
  meta: { type: Object, default: {} },
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);


// await Notification.create({
//   title: "New Message",
//   message: "You have a new message from Admin",
//   user: userId,
//   type: "info",
//   link: "/messages",
// });
