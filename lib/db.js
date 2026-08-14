import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route Handler updates.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongooseInstance) => {
      console.log('MongoDB successfully connected.');
      try {
        // Drop deprecated unique index on ScrumSession to apply the new team-only compound index
        await mongooseInstance.connection.db.collection('scrumsessions').dropIndex('date_1_sessionType_1_teamId_1');
        console.log('Deprecated ScrumSession index successfully dropped.');
      } catch (err) {
        // Safe to ignore if index does not exist or has already been dropped
      }
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
