"use server";

import { securityAwarenessChatbot, type SecurityAwarenessInput } from "@/ai/flows/security-awareness-flow";

export async function getSecurityAdvice(input: SecurityAwarenessInput) {
  try {
    const result = await securityAwarenessChatbot(input);
    return { success: true, advice: result.advice };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Sorry, I couldn't get advice right now. Please try again later." };
  }
}
