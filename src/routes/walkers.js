import { Router } from 'express'
import { Walker } from '../models/Walker.js'
import { Review } from '../models/Review.js'
import { PREDEFINED_SLOTS, SERVICES } from '../constants.js'

const router = Router()

/**
 * @openapi
 * /api/walkers:
 *   get:
 *     summary: Search walkers by city/area (case-insensitive substring)
 *     tags: [Walkers]
 *     parameters:
 *       - in: query
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Paginated walker list (newest first)
 *       400:
 *         description: Missing location
 */
router.get('/', async (req, res) => {
  const location = String(req.query.location || '').trim()
  if (!location) {
    return res.status(400).json({ error: 'Query parameter "location" is required' })
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5))
  const filter = { location: { $regex: location, $options: 'i' } }

  const [total, walkers] = await Promise.all([
    Walker.countDocuments(filter),
    Walker.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ])

  const withRatings = await Promise.all(
    walkers.map(async (w) => {
      const reviews = await Review.find({ walkerId: w._id }).lean()
      const avg =
        reviews.length === 0
          ? null
          : Math.round((reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) * 10) / 10
      return { ...w, id: w._id, averageRating: avg, reviewCount: reviews.length }
    })
  )

  res.json({
    page,
    limit,
    total,
    pageCount: Math.max(1, Math.ceil(total / limit)),
    walkers: withRatings,
  })
})

/**
 * @openapi
 * /api/walkers/{id}:
 *   get:
 *     summary: Get walker profile with reviews
 *     tags: [Walkers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Walker detail
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req, res) => {
  const walker = await Walker.findById(req.params.id).lean()
  if (!walker) return res.status(404).json({ error: 'Walker not found' })

  const reviews = await Review.find({ walkerId: walker._id }).sort({ createdAt: -1 }).lean()
  const averageRating =
    reviews.length === 0
      ? null
      : Math.round((reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) * 10) / 10

  res.json({
    ...walker,
    id: walker._id,
    averageRating,
    reviewCount: reviews.length,
    reviews: reviews.map((r) => ({
      id: r._id,
      stars: r.stars,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
  })
})

/**
 * @openapi
 * /api/walkers:
 *   post:
 *     summary: Register as a dog walker (Become dog walker)
 *     tags: [Walkers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, location, availableSlots]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               location:
 *                 type: string
 *               services:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [dog walk, dog bath]
 *               availableSlots:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Validation error
 */
router.post('/', async (req, res) => {
  const { firstName, lastName, email, location, services, availableSlots } = req.body || {}

  if (!firstName || !lastName || !email || !location) {
    return res.status(400).json({ error: 'firstName, lastName, email and location are required' })
  }
  if (!Array.isArray(availableSlots) || availableSlots.length === 0) {
    return res.status(400).json({ error: 'At least one availableSlots value is required' })
  }
  const invalidSlots = availableSlots.filter((s) => !PREDEFINED_SLOTS.includes(s))
  if (invalidSlots.length) {
    return res.status(400).json({
      error: 'Invalid slots',
      invalidSlots,
      allowed: PREDEFINED_SLOTS,
    })
  }

  const chosenServices = Array.isArray(services) && services.length ? services : ['dog walk']
  const badServices = chosenServices.filter((s) => !SERVICES.includes(s))
  if (badServices.length) {
    return res.status(400).json({ error: 'Invalid services', allowed: SERVICES })
  }

  try {
    const walker = await Walker.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(email).trim().toLowerCase(),
      location: String(location).trim(),
      services: chosenServices,
      availableSlots: [...new Set(availableSlots)],
    })
    res.status(201).json({ ...walker.toObject(), id: walker._id })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A walker with this email already exists' })
    }
    throw err
  }
})

export default router
