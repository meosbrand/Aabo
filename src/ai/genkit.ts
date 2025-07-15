/**
 * @fileoverview Genkit Initialization
 * This file configures and exports a global Genkit instance. It sets up the
 * necessary plugins (like Google AI) and defines a default model to be used
 * throughout the application for AI-powered features.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

/**
 * The global Genkit `ai` instance.
 *
 * This instance is configured with the Google AI plugin, enabling the use of
 * Google's Generative AI models (like Gemini). A default model is specified
 * to be used for generation tasks unless overridden.
 */
export const ai = genkit({
  plugins: [
    // Enables the use of Google's Gemini models.
    googleAI(),
  ],
  // Sets the default model for generation tasks. This can be overridden in specific calls.
  // defaultModel: 'gemini-1.5-flash',
});
