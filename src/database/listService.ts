import { db, openDatabase } from './database';

// Ensure the database is open before performing any operations
const ensureDbOpen = async () => {
  if (!db) {
    await openDatabase();
  }
};

// Add a new list
export const addList = async (name: string): Promise<number> => {
  try {
    await ensureDbOpen();

    if (db) {
      // Get the current max order to set the new list's order
      const result = db.getAllSync<{ maxOrder: number }>(
        `SELECT MAX("order") as maxOrder FROM lists;`
      );

      const newOrder = (result.length > 0 ? result[0].maxOrder : 0) + 1;

      const insertResult = await db.runAsync(
        `INSERT INTO lists (name, "order") VALUES (?, ?);`,
        [name, newOrder]
      );

      console.log('List added:', insertResult.lastInsertRowId);
      return insertResult.lastInsertRowId;
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Add list error:', error);
    throw error;
  }
};

// Get all lists
export const getLists = async (): Promise<{ id: number; name: string; order: number }[]> => {
  try {
    await ensureDbOpen();

    if (db) {
      const lists = db.getAllSync<{ id: number; name: string; order: number }>(
        `SELECT * FROM lists ORDER BY "order" ASC;`
      );
      return lists;
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Get lists error:', error);
    throw error;
  }
};

// Get a list by ID
export const getListById = async (id: number): Promise<{ id: number; name: string; order: number } | null> => {
  await ensureDbOpen();

  if (!db) {
    throw new Error('Database not initialized.');
  }

  try {
    // Fetch the first row matching the specified ID
    const result = await db.getFirstAsync<{ id: number; name: string; order: number }>(
      `SELECT id, name, "order" FROM lists WHERE id = ?;`,
      [id]
    );

    // Return the result if found, otherwise null
    return result || null;
  } catch (error) {
    console.error('Get list by ID error:', error);
    throw error;
  }
};

// Update a list
export const updateList = async (id: number, name: string): Promise<boolean> => {
  try {
    await ensureDbOpen();

    if (db) {
      const result = await db.runAsync(
        `UPDATE lists SET name = ? WHERE id = ?;`,
        [name, id]
      );

      if (result.changes > 0) {
        console.log('List updated:', id);
        return true;
      } else {
        throw new Error('No list found with the given ID.');
      }
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Update list error:', error);
    throw error;
  }
};

export const updateListOrder = async (id: number, order: number): Promise<boolean> => {
  try {
    await ensureDbOpen();

    if (db) {
      const result = await db.runAsync(
        `UPDATE lists SET "order" = ? WHERE id = ?;`,
        [order, id]
      );

      if (result.changes > 0) {
        console.log('List order updated:', id, order);
        return true;
      } else {
        throw new Error('No list found with the given ID.');
      }
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Update list order error:', error);
    throw error;
  }
};

// Delete a list
export const deleteList = async (id: number): Promise<boolean> => {
  try {
    await ensureDbOpen();

    if (db) {
      const result = await db.runAsync(`DELETE FROM lists WHERE id = ?;`, [id]);
      if (result.changes > 0) {
        console.log('List deleted:', id);
        return true;
      } else {
        throw new Error('No list found with the given ID.');
      }
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Delete list error:', error);
    throw error;
  }
};
