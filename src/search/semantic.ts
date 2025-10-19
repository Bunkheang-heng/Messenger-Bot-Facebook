import { generateImageEmbedding } from '../embedding/vertexai';
import { searchSimilarItems, ItemRecord } from '../database/supabase';

export interface SearchResult {
  item: Omit<ItemRecord, 'embedding'>;
  similarity: number;
}

/**
 * Perform semantic search for items similar to the uploaded image
 * @param imageUrl URL of the image to search with
 * @param limit Maximum number of results to return
 * @param threshold Minimum similarity threshold (0-1)
 */
export async function searchByImage(
  imageUrl: string,
  limit: number = 5,
  threshold: number = 0.5
): Promise<SearchResult[]> {
  // Generate embedding for the query image
  const queryEmbedding = await generateImageEmbedding(imageUrl);
  
  // Search for similar items in the database
  const results = await searchSimilarItems(queryEmbedding, limit, threshold);
  
  // Format results - include all product fields
  return results.map(result => ({
    item: {
      id: result.id,
      name: result.name,
      sku: result.sku,
      price: result.price,
      stock: result.stock,
      description: result.description,
      image_url: result.image_url || '',
      created_at: result.created_at,
      updated_at: result.updated_at,
      category_id: result.category_id,
      tenant_id: result.tenant_id
    },
    similarity: result.similarity
  }));
}

/**
 * Format search results into a user-friendly message
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "I couldn't find any matching products for your image. Try uploading a different image!";
  }
  
  let message = `I found ${results.length} similar product(s):\n\n`;
  
  results.forEach((result, index) => {
    const { item, similarity } = result;
    const confidencePercent = Math.round(similarity * 100);
    
    message += `${index + 1}. ${item.name}\n`;
    message += `   ${item.description}\n`;
    
    // Format price
    if (item.price) {
      message += `   Price: $${Number(item.price).toFixed(2)}\n`;
    }
    
    // Show stock status
    if (item.stock !== undefined) {
      const stockStatus = item.stock > 0 ? `In Stock (${item.stock})` : 'Out of Stock';
      message += `   Stock: ${stockStatus}\n`;
    }
    
    // Show SKU
    if (item.sku) {
      message += `   SKU: ${item.sku}\n`;
    }
    
    message += `   Match confidence: ${confidencePercent}%\n\n`;
  });
  
  return message.trim();
}

