/**
 * Script to generate embeddings for products in the database
 * Run this after adding new products to compute their embeddings
 * 
 * Usage: ts-node scripts/seed-products-embeddings.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { getSupabase, getAllProducts, type ProductRecord } from '../src/database/supabase';
import { generateImageEmbedding } from '../src/embedding/vertexai';

async function seedProductEmbeddings() {
  console.log('Starting embedding generation for products...');
  
  const supabase = getSupabase();
  
  // Fetch all products that don't have embeddings yet
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .is('embedding', null);
  
  if (error) {
    console.error('Error fetching products:', error);
    process.exit(1);
  }
  
  if (!products || products.length === 0) {
    console.log('No products without embeddings found.');
    return;
  }
  
  console.log(`Found ${products.length} products without embeddings.`);
  
  let processed = 0;
  let failed = 0;
  
  for (const product of products) {
    try {
      console.log(`Processing: ${product.name} (SKU: ${product.sku})...`);
      
      if (!product.image_url) {
        console.log(`  Skipping ${product.name} - no image URL`);
        failed++;
        continue;
      }
      
      // Generate embedding for the product's image
      const embedding = await generateImageEmbedding(product.image_url);
      
      // Update the product with the embedding
      const { error: updateError } = await supabase
        .from('products')
        .update({ embedding })
        .eq('id', product.id);
      
      if (updateError) {
        console.error(`  Failed to update ${product.name}:`, updateError);
        failed++;
      } else {
        console.log(`  ✓ Generated embedding for ${product.name}`);
        processed++;
      }
      
      // Add a small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`  Error processing ${product.name}:`, error);
      failed++;
    }
  }
  
  console.log('\n--- Summary ---');
  console.log(`Total products: ${products.length}`);
  console.log(`Successfully processed: ${processed}`);
  console.log(`Failed: ${failed}`);
}

// Run the script
seedProductEmbeddings()
  .then(() => {
    console.log('\nEmbedding generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

