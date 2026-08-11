import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { Walker } from '../models/Walker.js'
import { Reservation } from '../models/Reservation.js'
import { PREDEFINED_SLOTS, RESERVATION_STATUSES, REVIEW_VALIDITY_HOURS } from '../constants.js'

const router = Router()

/**
 * @openapi
 * /api/reservations:
 *   get:
 *     summary: List reservations for a walker by email
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation list
 *       400:
 *         description: Missing email
 */
router.get('/', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'Query parameter "email" is required' })

  const walker = await Walker.findOne({ email }).lean()
  if (!walker) return res.json({ reservations: [] })

  const reservations = await Reservation.find({ walkerId: walker._id })
    .sort({ createdAt: -1 })
    .lean()

  res.json({
    walkerId: walker._id,
    reservations: reservations.map((r) => ({
      ...r,
      id: r._id,
    })),
  })
})

/**
 * @openapi
 * /api/reservations:
 *   post:
 *     summary: Create a walk reservation (status pending)
 *     tags: [Reservations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [walkerId, timeSlot, dog, contact]
 *             properties:
 *               walkerId:
 *                 type: string
 *               timeSlot:
 *                 type: string
 *               dog:
 *                 type: object
 *                 properties:
 *                   breed:
 *                     type: string
 *                   age:
 *                     type: number
 *                   weight:
 *                     type: number
 *               contact:
 *                 type: object
 *                 properties:
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *     responses:
 *       201:
 *         description: Created with walkId valid for reviews for 24h
 *       400:
 *         description: Validation error
 *       404:
 *         description: Walker not found
 *       409:
 *         description: Slot no longer available
 */
router.post('/', async (req, res) => {
  const { walkerId, timeSlot, dog, contact } = req.body || {}

  if (!walkerId || !timeSlot || !dog || !contact) {
    return res.status(400).json({ error: 'walkerId, timeSlot, dog and contact are required' })
  }
  if (!PREDEFINED_SLOTS.includes(timeSlot)) {
    return res.status(400).json({ error: 'Invalid timeSlot', allowed: PREDEFINED_SLOTS })
  }
  if (!dog.breed || dog.age == null || dog.weight == null) {
    return res.status(400).json({ error: 'dog.breed, dog.age and dog.weight are required' })
  }
  if (!contact.phone || !contact.email) {
    return res.status(400).json({ error: 'contact.phone and contact.email are required' })
  }

  const walker = await Walker.findById(walkerId)
  if (!walker) return res.status(404).json({ error: 'Walker not found' })
  if (!walker.availableSlots.includes(timeSlot)) {
    return res.status(409).json({ error: 'Time slot is no longer available' })
  }

  walker.availableSlots = walker.availableSlots.filter((s) => s !== timeSlot)
  await walker.save()

  const now = new Date()
  const reviewExpiresAt = new Date(now.getTime() + REVIEW_VALIDITY_HOURS * 60 * 60 * 1000)
  const walkId = uuidv4()

  const reservation = await Reservation.create({
    walkId,
    walkerId: walker._id,
    timeSlot,
    dog: {
      breed: String(dog.breed).trim(),
      age: Number(dog.age),
      weight: Number(dog.weight),
    },
    contact: {
      phone: String(contact.phone).trim(),
      email: String(contact.email).trim().toLowerCase(),
    },
    status: 'pending',
    reviewExpiresAt,
    reviewed: false,
  })

  res.status(201).json({
    ...reservation.toObject(),
    id: reservation._id,
    message:
      'Reservation created as pending. Contact the walker by email/phone to agree on handover and compensation. Use walkId to leave a review within 24 hours.',
  })
})

/**
 * @openapi
 * /api/reservations/{walkId}:
 *   get:
 *     summary: Get reservation by public walkId
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: walkId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation
 *       404:
 *         description: Not found
 */
router.get('/:walkId', async (req, res) => {
  const reservation = await Reservation.findOne({ walkId: req.params.walkId }).lean()
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' })
  res.json({ ...reservation, id: reservation._id })
})

/**
 * @openapi
 * /api/reservations/{walkId}/status:
 *   patch:
 *     summary: Accept or reject a reservation
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: walkId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, rejected]
 *               email:
 *                 type: string
 *                 description: Walker email (simple ownership check)
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Email does not match walker
 *       404:
 *         description: Not found
 */
router.patch('/:walkId/status', async (req, res) => {
  const { status, email } = req.body || {}
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({
      error: 'status must be accepted or rejected',
      allowed: RESERVATION_STATUSES.filter((s) => s !== 'pending'),
    })
  }

  const reservation = await Reservation.findOne({ walkId: req.params.walkId })
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' })

  if (email) {
    const walker = await Walker.findById(reservation.walkerId).lean()
    if (!walker || walker.email !== String(email).trim().toLowerCase()) {
      return res.status(403).json({ error: 'email does not match this reservation walker' })
    }
  }

  reservation.status = status
  await reservation.save()
  res.json({ ...reservation.toObject(), id: reservation._id })
})

export default router
