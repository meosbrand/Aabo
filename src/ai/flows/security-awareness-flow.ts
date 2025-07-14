
'use server';

/**
 * @fileOverview Security awareness chatbot flow.
 *
 * - securityAwarenessChatbot - A function that provides security advice.
 * - SecurityAwarenessInput - The input type for the securityAwarenessChatbot function.
 * - SecurityAwarenessOutput - The return type for the securityAwarenessChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SecurityAwarenessInputSchema = z.object({
  query: z.string().describe('The user query about security. Be concise.'),
  language: z.enum(['en', 'pidgin']).optional().default('en'),
});
export type SecurityAwarenessInput = z.infer<typeof SecurityAwarenessInputSchema>;

const SecurityAwarenessOutputSchema = z.object({
  advice: z.string().describe('Concise and actionable security advice.'),
});
export type SecurityAwarenessOutput = z.infer<typeof SecurityAwarenessOutputSchema>;

export async function securityAwarenessChatbot(input: SecurityAwarenessInput): Promise<SecurityAwarenessOutput> {
  return securityAwarenessFlow(input);
}

const prompt = ai.definePrompt({
  name: 'securityAwarenessPrompt',
  input: {schema: SecurityAwarenessInputSchema},
  output: {schema: SecurityAwarenessOutputSchema},
  prompt: `
    {{#if (eq language "pidgin")}}
      You are Ààbò Co-Pilot, a sharp and funny AI security assistant from Nigeria. Your personality is witty, playful, and you speak authentic Nigerian Pidgin English. You make security advice sound like a gist with a friend, using plenty of humor, local slang, and analogies.

      Your goal is to give clear, sharp advice that makes the user feel like a security boss. Start your response with a funny greeting, then give the advice like you're sharing a hot gist.

      User Query: {{{query}}}
    {{else}}
      You are Ààbò Co-Pilot, a friendly and helpful AI security assistant. Your personality is warm, encouraging, and approachable. You avoid jargon and explain security concepts in a simple, conversational way.

      Your goal is to provide clear, actionable advice that empowers the user to feel safer online. Start your response in a friendly tone and then provide the security advice.

      User Query: {{{query}}}
    {{/if}}
  `,
});


const securityAwarenessFlow = ai.defineFlow(
  {
    name: 'securityAwarenessFlow',
    inputSchema: SecurityAwarenessInputSchema,
    outputSchema: SecurityAwarenessOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
