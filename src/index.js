import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { connectDb } from './db.js'
import { buildSwaggerSpec } from './swagger.js'
import walkersRouter from './routes/walkers.js'
import reservationsRouter from './routes/reservations.js'
import reviewsRouter from './routes/reviews.js'
import { PREDEFINED_SLOTS } from './constants.js'

const app = express()
const port = Number(process.env.PORT) || 3000
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/walk-dog'

app.use(cors())
app.use(express.json())

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/slots', (_req, res) => {
  res.json({ slots: PREDEFINED_SLOTS })
})

app.use('/api/walkers', walkersRouter)
app.use('/api/reservations', reservationsRouter)
app.use('/api/reviews', reviewsRouter)

const swaggerSpec = buildSwaggerSpec()
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

await connectDb(uri)
app.listen(port, () => {
  console.log(`Walk Dog API on http://localhost:${port}`)
  console.log(`Swagger UI: http://localhost:${port}/api/docs`)
})
