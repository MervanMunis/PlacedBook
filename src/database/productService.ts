import { db, openDatabase } from './database';
import * as FileSystem from 'expo-file-system';

// Ensure the database is open before performing any operations
const ensureDbOpen = async () => {
  if (!db) {
    await openDatabase();
  }
};

// Add a product
export const addProduct = async (product: {
  name: string;
  placeName?: string;
  price?: string;
  imageUrl?: string;
  city?: string;
  country?: string;
  date: Date;
  list_id: number;
  isFavorite?: boolean;
  location?: { latitude: number; longitude: number };
}): Promise<number> => {
  try {
    await ensureDbOpen();

    // Ensure the 'images' directory exists
    const imagesDir = `${FileSystem.documentDirectory}images`;
    const dirInfo = await FileSystem.getInfoAsync(imagesDir);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
    }
    
    // Store the image in the 'images' folder
    let imagePath = '';
    if (product.imageUrl) {
      try {
        const fileName = `${Date.now()}.jpg`;
        imagePath = `${FileSystem.documentDirectory}images/${fileName}`;
        await FileSystem.copyAsync({
          from: product.imageUrl,
          to: imagePath,
        });
      } catch (error) {
        console.error('Failed to save image:', error);
        throw new Error('Failed to save image');
      }
    }

    // Prepare parameters
    const params = [
      product.name,
      product.placeName ?? null,
      product.price ?? null,
      imagePath || null,
      product.city ?? null,
      product.country ?? null,
      product.date ? product.date.toISOString() : null,
      product.list_id,
      product.isFavorite ? 1 : 0,
      product.location?.latitude ?? null,
      product.location?.longitude ?? null
    ];

    // Insert product details into the database
    if (db) {
      const result = await db.runAsync(
        `INSERT INTO products (name, placeName, price, imageUrl, city, country, date, list_id, isFavorite, latitude, longitude) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        params
      );
      console.log('Product added:', result.lastInsertRowId);
      return result.lastInsertRowId;
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Add product error:', error);
    throw error;
  }
};

// Get all products for a specific list
export const getProductsByList = async (listId: number): Promise<any[]> => {
  try {
    await ensureDbOpen();

    if (db) {
      const products = await db.getAllAsync<any>(
        `SELECT id, name, placeName, price, imageUrl, city, country, date, list_id, isFavorite, latitude, longitude 
         FROM products WHERE list_id = ?;`,
        [listId]
      );
      return products;
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Get products by list error:', error);
    throw error;
  }
};

// Get all products
export const getAllProducts = async (): Promise<any[]> => {
  try {
    await ensureDbOpen();

    if (db) {
      const products = await db.getAllAsync<any>(
        `SELECT p.*, l.name as listName 
         FROM products p
         LEFT JOIN lists l ON p.list_id = l.id;`
      );
      return products;
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Get all products error:', error);
    throw error;
  }
};

// Update a product
export const updateProduct = async (
  id: number,
  name: string,
  placeName?: string,
  price?: string,
  imageUrl?: string,
  city?: string,
  country?: string,
  date?: Date,
  listId?: number,
  isFavorite?: boolean,
  latitude?: number,
  longitude?: number
): Promise<boolean> => {
  try {
    await ensureDbOpen();

    // Prepare parameters
    const params = [
      name,
      placeName ?? null,
      price ?? null,
      imageUrl ?? null,
      city ?? null,
      country ?? null,
      date ? date.toISOString() : null,
      listId ?? null,
      isFavorite ? 1 : 0,
      latitude ?? null,
      longitude ?? null,
      id,
    ];

    if (db) {
      const result = await db.runAsync(
        `UPDATE products 
         SET name = ?, placeName = ?, price = ?, imageUrl = ?, city = ?, country = ?, date = ?, list_id = ?, isFavorite = ?, latitude = ?, longitude = ?
         WHERE id = ?;`,
        params
      );
      if (result.changes > 0) {
        console.log('Product updated:', id);
        return true;
      } else {
        throw new Error('No product found with the given ID.');
      }
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Update product error:', error);
    throw error;
  }
};

// Toggle favorite status for a product
export const toggleFavorite = async (
  id: number,
  isFavorite: boolean
): Promise<boolean> => {
  try {
    await ensureDbOpen();

    if (db) {
      const result = await db.runAsync(
        `UPDATE products SET isFavorite = ? WHERE id = ?;`,
        [isFavorite ? 1 : 0, id]
      );
      if (result.changes > 0) {
        console.log('Favorite status toggled for product:', id);
        return true;
      } else {
        throw new Error('No product found with the given ID.');
      }
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    throw error;
  }
};

// Get the count of favorited products
export const getFavoriteProductsCount = async (): Promise<number> => {
  try {
    await ensureDbOpen();

    if (db) {
      // Use getAllSync to retrieve the result
      const result = db.getAllSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM products WHERE isFavorite = 1;`
      );

      // Since getAllSync returns an array, extract the first element
      if (result.length > 0) {
        return result[0].count;
      } else {
        return 0; // Return 0 if no result is found
      }
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Get favorite products count error:', error);
    throw error;
  }
};

// In productService.ts
export const getFavoriteProducts = async (): Promise<any[]> => {
  try {
    await ensureDbOpen();

    if (db) {
      const result = db.getAllSync<any>(
        `SELECT * FROM products WHERE isFavorite = 1;`
      );
      return result;
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Get favorite products error:', error);
    throw error;
  }
};

// Delete a product
export const deleteProduct = async (id: number): Promise<boolean> => {
  try {
    await ensureDbOpen();

    if (db) {
      const result = await db.runAsync(
        `DELETE FROM products WHERE id = ?;`,
        [id]
      );
      if (result.changes > 0) {
        console.log('Product deleted:', id);
        return true;
      } else {
        throw new Error('No product found with the given ID.');
      }
    } else {
      throw new Error('Database not initialized.');
    }
  } catch (error) {
    console.error('Delete product error:', error);
    throw error;
  }
};
