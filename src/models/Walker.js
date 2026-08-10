import mongoose from 'mongoose'
import { PREDEFINED_SLOTS, SERVICES } from '../constants.js'

const walkerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    location: { type: String, required: true, trim: true },
    services: {
      type: [{ type: String, enum: SERVICES }],
      default: ['dog walk'],
    },
    availableSlots: {
      type: [String],
      validate: {
        validator(slots) {
          return slots.every((s) => PREDEFINED_SLOTS.includes(s))
        },
        message: 'Slots must be from the predefined list',
      },
      default: [],
    },
  },
  { timestamps: true }
)

walkerSchema.index({ location: 1, createdAt: -1 })

export const Walker = mongoose.model('Walker', walkerSchema)
