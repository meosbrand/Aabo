// Summarizes lengthy security articles into key takeaways and action items.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeSecurityTipsInputSchema = z.object({
  articleText: z
    .string()
    .describe('The text content of the security article or guide.'),
});
export type SummarizeSecurityTipsInput = z.infer<
  typeof SummarizeSecurityTipsInputSchema
>;

const SummarizeSecurityTipsOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the security article.'),
  actionItems: z
    .string()
    .describe('A list of actionable steps derived from the article.'),
});
export type SummarizeSecurityTipsOutput = z.infer<
  typeof SummarizeSecurityTipsOutputSchema
>;

export async function summarizeSecurityTips(
  input: SummarizeSecurityTipsInput
): Promise<SummarizeSecurityTipsOutput> {
  return summarizeSecurityTipsFlow(input);
}

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

const summarizeSecurityTipsFlow = ai.defineFlow(
  {
    name: 'summarizeSecurityTipsFlow',
    inputSchema: SummarizeSecurityTipsInputSchema,
    outputSchema: SummarizeSecurityTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
