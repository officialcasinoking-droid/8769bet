import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import { landingContent } from './store.js'

dotenv.config()

const app = express()

// CORS - allow multiple localhost ports for dev
const allowedOrigins = [
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3000',
  'http://localhost:5173',
]
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(null, true)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Handle preflight
app.options('*', cors())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
})
app.use('/api/', limiter)

// Body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/public', express.static('public'))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

// Public landing page endpoint - reads from SAME shared data as admin
app.get('/api/landing', (req, res) => {
  res.json(landingContent)
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

const PORT = process.env.PORT || 3006

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
