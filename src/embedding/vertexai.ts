import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { google } from '@google-cloud/aiplatform/build/protos/protos';
import axios from 'axios';

let predictionClient: PredictionServiceClient | null = null;

function getPredictionClient(): PredictionServiceClient {
  if (!predictionClient) {
    const projectId = process.env.VERTEX_AI_PROJECT_ID;
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    if (!projectId) {
      throw new Error('Missing required env var: VERTEX_AI_PROJECT_ID');
    }
    
    predictionClient = new PredictionServiceClient({
      apiEndpoint: `${location}-aiplatform.googleapis.com`
    });
  }
  return predictionClient;
}

/**
 * Download image from URL and convert to base64
 */
async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 10 * 1024 * 1024 // 10MB max
    });
    
    const base64 = Buffer.from(response.data).toString('base64');
    return base64;
  } catch (error) {
    throw new Error(`Failed to download image: ${error}`);
  }
}

/**
 * Generate embedding from an image using Vertex AI multimodalembedding@001
 * @param imageUrl URL of the image to embed
 * @param dimension Optional embedding dimension (default: 1408, max for multimodalembedding@001)
 */
export async function generateImageEmbedding(
  imageUrl: string,
  dimension: number = 1408
): Promise<number[]> {
  const client = getPredictionClient();
  const projectId = process.env.VERTEX_AI_PROJECT_ID;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  
  if (!projectId) {
    throw new Error('Missing VERTEX_AI_PROJECT_ID');
  }
  
  // Download the image and convert to base64
  const imageBase64 = await downloadImageAsBase64(imageUrl);
  
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/multimodalembedding@001`;
  
  const instance = {
    image: {
      bytesBase64Encoded: imageBase64
    }
  };
  
  const parameters = {
    dimension: dimension
  };
  
  const request: any = {
    endpoint,
    instances: [instance],
    parameters
  };
  
  try {
    const [response] = await client.predict(request);
    
    if (!response.predictions || response.predictions.length === 0) {
      throw new Error('No predictions returned from Vertex AI');
    }
    
    const prediction = response.predictions[0];
    const predictionObj = prediction?.structValue?.fields;
    
    if (!predictionObj) {
      throw new Error('Invalid prediction structure');
    }
    
    // Extract image embedding from the response
    const imageEmbedding = predictionObj['imageEmbedding']?.listValue?.values;
    
    if (!imageEmbedding) {
      throw new Error('No image embedding in response');
    }
    
    const embedding: number[] = imageEmbedding.map((v: any) => v.numberValue || 0);
    
    return embedding;
  } catch (error: any) {
    console.error('Vertex AI embedding error:', error);
    throw new Error(`Failed to generate image embedding: ${error.message || error}`);
  }
}

/**
 * Generate embedding from text using Vertex AI multimodalembedding@001
 * This can be useful for text-based search queries
 */
export async function generateTextEmbedding(
  text: string,
  dimension: number = 1408
): Promise<number[]> {
  const client = getPredictionClient();
  const projectId = process.env.VERTEX_AI_PROJECT_ID;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  
  if (!projectId) {
    throw new Error('Missing VERTEX_AI_PROJECT_ID');
  }
  
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/multimodalembedding@001`;
  
  const instance = {
    text: text.trim()
  };
  
  const parameters = {
    dimension: dimension
  };
  
  const request: any = {
    endpoint,
    instances: [instance],
    parameters
  };
  
  try {
    const [response] = await client.predict(request);
    
    if (!response.predictions || response.predictions.length === 0) {
      throw new Error('No predictions returned from Vertex AI');
    }
    
    const prediction = response.predictions[0];
    const predictionObj = prediction?.structValue?.fields;
    
    if (!predictionObj) {
      throw new Error('Invalid prediction structure');
    }
    
    // Extract text embedding from the response
    const textEmbedding = predictionObj['textEmbedding']?.listValue?.values;
    
    if (!textEmbedding) {
      throw new Error('No text embedding in response');
    }
    
    const embedding: number[] = textEmbedding.map((v: any) => v.numberValue || 0);
    
    return embedding;
  } catch (error: any) {
    console.error('Vertex AI embedding error:', error);
    throw new Error(`Failed to generate text embedding: ${error.message || error}`);
  }
}

