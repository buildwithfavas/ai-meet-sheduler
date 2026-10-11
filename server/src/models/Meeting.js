import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    startTime: {
      type: String, // HH:mm
      required: true
    },
    endTime: {
      type: String, // HH:mm
      required: true
    },
    durationMinutes: {
      type: Number,
      default: 30
    },
    attendees: {
      type: [String],
      required: true
    },
    agenda: {
      type: [String],
      default: []
    },
    meetingLink: {
      type: String,
      default: ""
    },
    googleCalendarUrl: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["CONFIRMED", "CANCELLED"],
      default: "CONFIRMED"
    }
  },
  {
    timestamps: true
  }
);

export const Meeting = mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);
