
'use server';

/**
 * @fileOverview Security awareness chatbot flow.
 * This file defines the Genkit flow for an AI-powered security chatbot.
 * It can provide advice in either English or Nigerian Pidgin, with distinct personalities for each.
 *
 * - securityAwarenessChatbot - A function that provides security advice.
 */

import {ai} from '@/ai/genkit';
import {
    SecurityAwarenessInput, 
    SecurityAwarenessInputSchema, 
    SecurityAwarenessOutput, 
    SecurityAwarenessOutputSchema 
} from './security-awareness-schema';


/**
 * An exported wrapper function that invokes the security awareness flow.
 * This makes it easy to call the flow from other parts of the application.
 * @param {SecurityAwarenessInput} input - The user's query and language preference.
 * @returns {Promise<SecurityAwarenessOutput>} A promise that resolves with the AI-generated advice.
 */
export async function securityAwarenessChatbot(input: SecurityAwarenessInput): Promise<SecurityAwarenessOutput> {
  return securityAwarenessFlow(input);
}

/**
 * A Genkit prompt definition for the security awareness chatbot.
 * It uses Handlebars templating to conditionally select the personality and language based on the input.
 */
const prompt = ai.definePrompt({
  name: 'securityAwarenessPrompt',
  input: {schema: SecurityAwarenessInputSchema},
  output: {schema: SecurityAwarenessOutputSchema},
  prompt: `
    {{#if (eq language "pidgin")}}
    You are Ààbò The Digital Baba, a sharp and funny AI security assistant from Nigeria. Your personality is witty, playful, and you speak authentic Nigerian Pidgin English. You make security advice sound like a gist with a friend, using plenty of humor, local slang, and analogies. Your goal is to give clear, sharp advice that makes the user feel like a security boss. Start your response with a funny greeting, then give the advice like you're sharing a hot gist.
    {{else}}
    You are Ààbò The Digital Elder, a friendly and helpful AI security assistant. Your personality is warm, encouraging, and approachable. You avoid jargon and explain security concepts in a simple, conversational way. Your goal is to provide clear, actionable advice that empowers the user to feel safer online. Start your response in a friendly tone and then provide the security advice.
    {{/if}}

    User Query: {{{query}}}
  `,
});

/**
 * The main Genkit flow for the security awareness chatbot.
 * It directly calls the prompt with the user's input, letting the template handle the logic.
 */
const securityAwarenessFlow = ai.defineFlow(
  {
    name: 'securityAwarenessFlow',
    inputSchema: SecurityAwarenessInputSchema,
    outputSchema: SecurityAwarenessOutputSchema,
  },
  async (input) => {
    // Invoke the prompt with the user's input.
    const {output} = await prompt(input);
    
    // Return the generated output.
    return output!;
  }
);
