import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    walkId: { type: String, required: true, unique: true },
    walkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Walker', required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 150, trim: true },
  },
  { timestamps: true }
)

export const Review = mongoose.model('Review', reviewSchema)
