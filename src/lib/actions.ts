
"use server";

import { securityAwarenessChatbot, type SecurityAwarenessInput } from "@/ai/flows/security-awareness-flow";

export async function getSecurityAdvice(input: SecurityAwarenessInput) {
  try {
    const result = await securityAwarenessChatbot(input);
    return { success: true, advice: result.advice };
  } catch (error) {
    console.error("Error calling securityAwarenessChatbot:", error);
    const errorMessage = input.language === 'pidgin' 
      ? "Sorry o, my brain just hang. I no fit get advice for you now. Try again later." 
      : "Sorry, I couldn't get advice right now. Please try again later.";
    return { success: false, error: errorMessage };
  }
}
