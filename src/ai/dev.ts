/**
 * @fileoverview Development entry point for Genkit.
 * This file is used by the `genkit start` command to initialize and register
 * all the AI flows for the development server. It also loads environment
 * variables from a .env file.
 */

import { config } from 'dotenv';
// Load environment variables from a .env file into process.env
config();

// Import AI flows to register them with the Genkit development server.
import '@/ai/flows/security-awareness-flow.ts';
import '@/ai/flows/summarize-security-tips.ts';