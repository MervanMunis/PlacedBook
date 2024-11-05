import * as SQLite from 'expo-sqlite';

// Open the database instance
let db: SQLite.SQLiteDatabase | null = null;

// Open the database asynchronously
export const openDatabase = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('spotlyApp.db');
    console.log('Database opened successfully');
  }
  return db;
};

// Initialize the database and create tables if needed
export const initializeDatabase = async () => {
  await openDatabase();

  if (db) {
    try {
      await db.execAsync('PRAGMA journal_mode = WAL');
      await db.execAsync('PRAGMA foreign_keys = ON');

      // Create tables
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          "order" INTEGER DEFAULT 0
        );
      `);
      
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          placeName TEXT,
          price TEXT,
          imageUrl TEXT,
          city TEXT,
          country TEXT,
          date TEXT,
          list_id INTEGER,
          isFavorite INTEGER DEFAULT 0,
          latitude REAL,
          longitude REAL,
          FOREIGN KEY (list_id) REFERENCES lists (id)
        );
      `);

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw new Error('Failed to initialize database');
    }
  } else {
    throw new Error('Database instance not available');
  }
};

// Export the database instance
export { db };
