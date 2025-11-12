require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const db = require('./models/db');

// Check if MongoDB is being used
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;
const isMongoDB = MONGODB_URI && (
  MONGODB_URI.startsWith('mongodb://') || 
  MONGODB_URI.startsWith('mongodb+srv://')
);

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const tasksRoutes = require('./routes/tasks');
const incentivesRoutes = require('./routes/incentives');
const reportsRoutes = require('./routes/reports');

const app = express();
// Configure Helmet to allow inline scripts (needed for language selection)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://use.fontawesome.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:", "https://cdnjs.cloudflare.com", "https://use.fontawesome.com", "https://fonts.gstatic.com"],
      // Allow Google Fonts stylesheet
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://use.fontawesome.com", "https://fonts.googleapis.com"],
      styleSrcAttr: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors());
app.use(express.json());

// API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/incentives', incentivesRoutes);
app.use('/api/reports', reportsRoutes);

// Serve frontend static files
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Serve index.html.html as the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html.html'));
});

// Fallback to index.html.html for SPA routes (but not API routes)
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Skip static file requests that exist
  if (req.path.match(/\.(html|css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  // Serve index.html.html for all other routes
  res.sendFile(path.join(publicDir, 'index.html.html'));
});

const PORT = process.env.PORT || 4000;

async function initializeServer() {
  try {
    if (isMongoDB) {
      // Initialize MongoDB
      const { initMongoDB } = require('./models/mongodb');
      await initMongoDB();
      console.log('✅ MongoDB initialized');
    } else {
      // Initialize SQL database
      await db.init();
      console.log('✅ SQL database initialized');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${isMongoDB ? 'MongoDB' : 'SQL'}`);
    });
  } catch (err) {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  }
}

initializeServer();
