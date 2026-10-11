import mongoose from "mongoose";

const calendarEventSchema = new mongoose.Schema(
  {
    attendee: {
      type: String, // email
      required: true,
      lowercase: true,
      index: true
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
    title: {
      type: String,
      default: "Busy"
    },
    bookingId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast lookup of attendee availability on a date
calendarEventSchema.index({ attendee: 1, date: 1 });

export const CalendarEvent = mongoose.models.CalendarEvent || mongoose.model("CalendarEvent", calendarEventSchema);
