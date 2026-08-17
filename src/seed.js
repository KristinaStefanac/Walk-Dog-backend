import 'dotenv/config'
import { connectDb } from './db.js'
import { Walker } from './models/Walker.js'
import { Review } from './models/Review.js'
import { Reservation } from './models/Reservation.js'

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/walk-dog'

const seedWalkers = [
  {
    firstName: 'Ana',
    lastName: 'Horvat',
    email: 'ana.horvat@example.com',
    location: 'Zagreb',
    services: ['dog walk', 'dog bath'],
    availableSlots: ['09:00-10:00', '16:00-17:00', '17:00-18:00'],
  },
  {
    firstName: 'Marko',
    lastName: 'Kovac',
    email: 'marko.kovac@example.com',
    location: 'Zagreb Centar',
    services: ['dog walk'],
    availableSlots: ['10:00-11:00', '14:00-15:00'],
  },
  {
    firstName: 'Ivana',
    lastName: 'Novak',
    email: 'ivana.novak@example.com',
    location: 'Split',
    services: ['dog walk', 'dog bath'],
    availableSlots: ['09:00-10:00', '10:00-11:00', '16:00-17:00'],
  },
  {
    firstName: 'Petar',
    lastName: 'Babic',
    email: 'petar.babic@example.com',
    location: 'Zagreb',
    services: ['dog walk'],
    availableSlots: ['14:00-15:00', '16:00-17:00'],
  },
  {
    firstName: 'Lana',
    lastName: 'Juric',
    email: 'lana.juric@example.com',
    location: 'Rijeka',
    services: ['dog bath'],
    availableSlots: ['10:00-11:00', '17:00-18:00'],
  },
  {
    firstName: 'Tomislav',
    lastName: 'Matic',
    email: 'tomislav.matic@example.com',
    location: 'Zagreb Tresnjevka',
    services: ['dog walk', 'dog bath'],
    availableSlots: ['09:00-10:00', '14:00-15:00', '17:00-18:00'],
  },
]

async function seed() {
  await connectDb(uri)
  await Promise.all([
    Review.deleteMany({}),
    Reservation.deleteMany({}),
    Walker.deleteMany({}),
  ])

  const walkers = await Walker.insertMany(seedWalkers)
  console.log(`Seeded ${walkers.length} walkers`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
