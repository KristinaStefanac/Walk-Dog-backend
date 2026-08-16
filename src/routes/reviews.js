import { Router } from 'express'
import { Reservation } from '../models/Reservation.js'
import { Review } from '../models/Review.js'

const router = Router()

/**
 * @openapi
 * /api/reviews:
 *   post:
 *     summary: Submit a review using a walkId (valid for 24h after reservation)
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [walkId, stars, comment]
 *             properties:
 *               walkId:
 *                 type: string
 *               stars:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 150
 *     responses:
 *       201:
 *         description: Review created
 *       400:
 *         description: Validation / expired / already reviewed
 *       404:
 *         description: Walk not found
 */
router.post('/', async (req, res) => {
  const { walkId, stars, comment } = req.body || {}

  if (!walkId || stars == null || !comment) {
    return res.status(400).json({ error: 'walkId, stars and comment are required' })
  }

  const starsNum = Number(stars)
  if (!Number.isInteger(starsNum) || starsNum < 1 || starsNum > 5) {
    return res.status(400).json({ error: 'stars must be an integer from 1 to 5' })
  }

  const text = String(comment).trim()
  if (!text || text.length > 150) {
    return res.status(400).json({ error: 'comment must be 1–150 characters' })
  }

  const reservation = await Reservation.findOne({ walkId: String(walkId).trim() })
  if (!reservation) return res.status(404).json({ error: 'Walk not found' })

  if (reservation.reviewed) {
    return res.status(400).json({ error: 'This walk was already reviewed' })
  }

  if (new Date() > new Date(reservation.reviewExpiresAt)) {
    return res.status(400).json({
      error: 'Review window expired. Feedback is only allowed within 24 hours of the reservation.',
    })
  }

  try {
    const review = await Review.create({
      walkId: reservation.walkId,
      walkerId: reservation.walkerId,
      stars: starsNum,
      comment: text,
    })
    reservation.reviewed = true
    await reservation.save()
    res.status(201).json({ ...review.toObject(), id: review._id })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'This walk was already reviewed' })
    }
    throw err
  }
})

export default router
