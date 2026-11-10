const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://restivo_admin:restivo_admin123@cluster0.dlf8l6c.mongodb.net/restivo?retryWrites=true&w=majority";

async function seedAtlas() {
  console.log('Connecting to MongoDB Atlas at:', MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    console.log('✅ Connected to MongoDB Atlas successfully!');

    const jsonPath = path.join(__dirname, '..', 'data', 'db.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Data file not found at ${jsonPath}`);
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const db = mongoose.connection.db;

    for (const [table, rows] of Object.entries(data)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const collName = table.toLowerCase() + 's';
      const collection = db.collection(collName);

      console.log(`Syncing ${rows.length} documents into collection "${collName}"...`);
      for (const row of rows) {
        const id = row.id || row._id;
        await collection.updateOne(
          { $or: [{ id }, { _id: id }] },
          { $set: row },
          { upsert: true }
        );
      }
    }

    console.log('🎉 All Negzaoui data (User, Restaurant Djerb, 3D Menu Items) synced to MongoDB Atlas!');
  } catch (err) {
    console.error('❌ Failed to sync to MongoDB Atlas:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seedAtlas();
