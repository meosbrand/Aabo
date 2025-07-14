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
  prompt: `You are the Ààbò Co-Pilot, an AI-powered chatbot that serves as a security awareness tool.

  A user is asking for security advice. Provide clear, concise, and actionable advice to improve their digital safety.

  User Query: {{{query}}}
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
