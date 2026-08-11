import mongoose from 'mongoose'
import { PREDEFINED_SLOTS, RESERVATION_STATUSES } from '../constants.js'

const reservationSchema = new mongoose.Schema(
  {
    walkId: { type: String, required: true, unique: true, index: true },
    walkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Walker', required: true },
    timeSlot: {
      type: String,
      required: true,
      enum: PREDEFINED_SLOTS,
    },
    dog: {
      breed: { type: String, required: true, trim: true },
      age: { type: Number, required: true, min: 0 },
      weight: { type: Number, required: true, min: 0 },
    },
    contact: {
      phone: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
    },
    status: {
      type: String,
      enum: RESERVATION_STATUSES,
      default: 'pending',
    },
    reviewExpiresAt: { type: Date, required: true },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const Reservation = mongoose.model('Reservation', reservationSchema)
