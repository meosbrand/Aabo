/**
 * @fileOverview AI flow for summarizing security articles.
 * This file defines a Genkit flow that takes a lengthy security article
 * and condenses it into key takeaways and a list of actionable items.
 *
 * - summarizeSecurityTips: The main function to call the summarization flow.
 * - SummarizeSecurityTipsInput: The input type for the flow.
 * - SummarizeSecurityTipsOutput: The output type for the flow.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Defines the schema for the input to the summarization flow.
 */
const SummarizeSecurityTipsInputSchema = z.object({
  /** The full text content of the security article or guide to be summarized. */
  articleText: z
    .string()
    .describe('The text content of the security article or guide.'),
});

/**
 * The type representing the input for the summarizeSecurityTips function.
 */
export type SummarizeSecurityTipsInput = z.infer<
  typeof SummarizeSecurityTipsInputSchema
>;

/**
 * Defines the schema for the output of the summarization flow.
 */
const SummarizeSecurityTipsOutputSchema = z.object({
  /** A concise summary of the key points from the article. */
  summary: z
    .string()
    .describe('A concise summary of the security article.'),
  /** A bulleted or numbered list of concrete steps a user can take. */
  actionItems: z
    .string()
    .describe('A list of actionable steps derived from the article.'),
});

/**
 * The type representing the output of the summarizeSecurityTips function.
 */
export type SummarizeSecurityTipsOutput = z.infer<
  typeof SummarizeSecurityTipsOutputSchema
>;

/**
 * An exported wrapper function that invokes the summarization flow.
 * @param {SummarizeSecurityTipsInput} input - The article text to be summarized.
 * @returns {Promise<SummarizeSecurityTipsOutput>} A promise that resolves with the summary and action items.
 */
export async function summarizeSecurityTips(
  input: SummarizeSecurityTipsInput
): Promise<SummarizeSecurityTipsOutput> {
  return summarizeSecurityTipsFlow(input);
}

/**
 * A Genkit prompt definition for the summarization task.
 * It instructs an AI expert to extract key takeaways and actionable items from the provided text.
 */
const prompt = ai.definePrompt({
  name: 'summarizeSecurityTipsPrompt',
  input: {schema: SummarizeSecurityTipsInputSchema},
  output: {schema: SummarizeSecurityTipsOutputSchema},
  prompt: `You are a security expert. Summarize the following security article or guide into key takeaways and a list of actionable items.

Article Text:
{{articleText}}

Summary:

Actionable Items:`,
});

/**
 * The Genkit flow that orchestrates the summarization process.
 * It takes the article text, calls the prompt, and returns the structured output.
 */
const summarizeSecurityTipsFlow = ai.defineFlow(
  {
    name: 'summarizeSecurityTipsFlow',
    inputSchema: SummarizeSecurityTipsInputSchema,
    outputSchema: SummarizeSecurityTipsOutputSchema,
  },
  async input => {
    // Call the prompt with the provided input.
    const {output} = await prompt(input);
    // Return the structured output from the prompt.
    return output!;
  }
);