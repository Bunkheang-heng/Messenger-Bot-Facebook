import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  description: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  tenant_id: string | null;
  embedding?: number[];
}

// Keep ItemRecord as alias for backward compatibility
export type ItemRecord = ProductRecord;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabaseClient;
}

/**
 * Insert or update a product with its embedding in the database
 */
export async function upsertProductWithEmbedding(
  name: string,
  description: string,
  embedding: number[],
  imageUrl: string,
  sku: string,
  price: number,
  stock: number = 0,
  categoryId?: string,
  tenantId?: string
): Promise<ProductRecord> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('products')
    .upsert({
      name,
      sku,
      price,
      stock,
      description,
      image_url: imageUrl,
      embedding,
      category_id: categoryId,
      tenant_id: tenantId
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to upsert product: ${error.message}`);
  }
  
  return data;
}

// Keep old function name as alias for backward compatibility
export const upsertItemWithEmbedding = upsertProductWithEmbedding;

/**
 * Perform semantic search using pgvector's cosine similarity
 * Returns the most similar products based on the query embedding
 */
export async function searchSimilarProducts(
  queryEmbedding: number[],
  limit: number = 5,
  threshold: number = 0.5,
  tenantId?: string
): Promise<Array<ProductRecord & { similarity: number }>> {
  const supabase = getSupabase();
  
  // Use pgvector's cosine distance operator (<=>)
  // Note: 1 - cosine_distance = cosine_similarity
  const { data, error } = await supabase.rpc('search_products_by_embedding', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
    filter_tenant_id: tenantId
  });
  
  if (error) {
    throw new Error(`Failed to search products: ${error.message}`);
  }
  
  return data || [];
}

// Keep old function name as alias for backward compatibility
export const searchSimilarItems = searchSimilarProducts;

/**
 * Get all products from the database
 */
export async function getAllProducts(
  limit: number = 100,
  tenantId?: string
): Promise<ProductRecord[]> {
  const supabase = getSupabase();
  
  let query = supabase
    .from('products')
    .select('*')
    .limit(limit)
    .order('created_at', { ascending: false });
  
  // Filter by tenant if provided
  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
  
  return data || [];
}

// Keep old function name as alias for backward compatibility
export const getAllItems = getAllProducts;

