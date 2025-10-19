/**
 * Script to generate embeddings for items in the database
 * Run this after adding new items to the database to compute their embeddings
 * 
 * Usage: ts-node scripts/seed-embeddings.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { getSupabase, getAllItems, type ItemRecord } from '../src/database/supabase';
import { generateImageEmbedding } from '../src/embedding/vertexai';

async function seedEmbeddings() {
  console.log('Starting embedding generation for items...');
  
  const supabase = getSupabase();
  
  // Fetch all items that don't have embeddings yet
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .is('embedding', null);
  
  if (error) {
    console.error('Error fetching items:', error);
    process.exit(1);
  }
  
  if (!items || items.length === 0) {
    console.log('No items without embeddings found.');
    return;
  }
  
  console.log(`Found ${items.length} items without embeddings.`);
  
  let processed = 0;
  let failed = 0;
  
  for (const item of items) {
    try {
      console.log(`Processing: ${item.name}...`);
      
      if (!item.image_url) {
        console.log(`  Skipping ${item.name} - no image URL`);
        failed++;
        continue;
      }
      
      // Generate embedding for the item's image
      const embedding = await generateImageEmbedding(item.image_url);
      
      // Update the item with the embedding
      const { error: updateError } = await supabase
        .from('items')
        .update({ embedding })
        .eq('id', item.id);
      
      if (updateError) {
        console.error(`  Failed to update ${item.name}:`, updateError);
        failed++;
      } else {
        console.log(`  ✓ Generated embedding for ${item.name}`);
        processed++;
      }
      
      // Add a small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`  Error processing ${item.name}:`, error);
      failed++;
    }
  }
  
  console.log('\n--- Summary ---');
  console.log(`Total items: ${items.length}`);
  console.log(`Successfully processed: ${processed}`);
  console.log(`Failed: ${failed}`);
}

// Run the script
seedEmbeddings()
  .then(() => {
    console.log('\nEmbedding generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

