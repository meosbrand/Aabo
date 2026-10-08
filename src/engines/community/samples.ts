/**
 * @fileoverview Labelled messages for evaluating the community engine. Written for this repository;
 * all names, numbers and links are fictitious. `ham` messages are legitimate and must not be
 * called scams.
 */

import type { LabelledSample } from '@/core/evaluate';

export const COMMUNITY_SAMPLES: LabelledSample[] = [
  // --- scams ---
  { label: 'scam', category: 'account_takeover', text: 'Good afternoon sir, a 6-digit code was sent to your phone by mistake while I was registering my business account. Kindly send it to me so I can finish.' },
  { label: 'scam', category: 'account_takeover', text: 'Mama abeg, the people from the bank said I should forward the OTP they sent you, it is urgent' },
  { label: 'scam', category: 'phishing', text: 'Dear customer, your ATM card has been restricted. Reply with your card number, expiry date and CVV to reactivate it today.' },
  { label: 'scam', category: 'phishing', minLevel: 'LIKELY_SCAM', text: 'Your BVN has been flagged for review. Update it now at https://bvn-review-portal.top/update or your account will be deactivated within 24 hours.' },
  { label: 'scam', minLevel: 'LIKELY_SCAM', text: 'CONGRATULATIONS! Your number has won N2,500,000 in the anniversary promo. Pay N15,000 processing fee to claim your prize.' },
  { label: 'scam', category: 'job', text: 'You have been shortlisted for the customer service job at our Lagos office. Pay ₦10,000 for your appointment letter before Friday.' },
  { label: 'scam', category: 'investment', text: 'Invest ₦50,000 today and get ₦150,000 in 7 days. Guaranteed returns, no risk. Our clients are smiling every week!' },
  { label: 'scam', minLevel: 'LIKELY_SCAM', text: 'This is EFCC. Your account is under investigation for fraud. Pay the clearance fine of 300k to this account to avoid arrest.' },
  { label: 'scam', category: 'bec', text: 'Hello, our account details have changed. Kindly make the payment for invoice 0045 into our new account 0987654321, Providus Bank.' },
  { label: 'scam', minLevel: 'LIKELY_SCAM', text: 'Free 20GB data for all Airtel users! Click http://airtel-free-data.click and share to 10 groups to activate.' },
  { label: 'scam', text: "Hi dear, I am a doctor serving overseas. I want to send you a parcel with $500,000 but you must pay the customs clearance charge first. Don't tell anyone." },
  { label: 'scam', category: 'malware', minLevel: 'DANGEROUS', fileName: 'Zenith_Update.apk', text: 'Please install this update to continue receiving alerts' },
  { label: 'scam', category: 'malware', minLevel: 'DANGEROUS', fileName: 'Receipt_0349.pdf.exe', text: 'Here is the payment receipt' },
  { label: 'scam', minLevel: 'LIKELY_SCAM', text: 'Your WhatsApp will be blocked in 24 hours for violating policy. Verify your account here: http://whatsapp-support-verify.com/login' },
  { label: 'scam', category: 'investment', text: 'Send me 0.05 BTC to bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh and I will send back double in 24 hours.' },
  { label: 'scam', category: 'giveaway', text: 'FG Palliative: All NIN holders are entitled to ₦75,000 support. Claim your grant now via https://fg-support-grant.online before midnight.' },
  { label: 'scam', minLevel: 'LIKELY_SCAM', text: 'Your Opay account will be suspended today. Call our support line 0809 555 1234 and give the agent the PIN you use for transfers.' },
  { label: 'scam', text: 'Loan approved! Get ₦200,000 instantly with no BVN. Pay ₦5,000 activation fee to receive the money in your account.' },
  { label: 'scam', minLevel: 'LIKELY_SCAM', text: 'Dear valued customer, kindly confirm your internet banking password by replying to this message to avoid account closure.' },
  { label: 'scam', minLevel: 'LIKELY_SCAM', text: "Hello, this is your boss. I'm in a meeting. Buy 5 gift cards of $100 each and send me the codes urgently. Keep this between us." },
  { label: 'scam', category: 'giveaway', text: 'Congrats! You have been selected to receive a Samsung Galaxy from our anniversary giveaway. Send your home address and ₦3,500 for shipping.' },
  { label: 'scam', minLevel: 'LIKELY_SCAM', text: 'URGENT: Your Kuda account has been restricted. Log in at http://kuda-secure-verify.top/login to restore access.' },
  { label: 'scam', category: 'investment', text: 'I saw your number in a business group. I trade forex for clients, 30% weekly profit guaranteed. Start with just ₦20,000.' },
  { label: 'scam', minLevel: 'LIKELY_SCAM', text: 'Police: there is a warrant for your arrest over a fraud case. Transfer ₦150,000 bail to officer account 2088776655 now now.' },

  // --- legitimate ---
  { label: 'ham', text: 'Acct: 01****89 Amt: NGN25,000.00 CR Desc: TRF FROM ADEBAYO STORES Avail Bal: NGN143,220.50 Date: 12-Mar-2026' },
  { label: 'ham', text: '<#> 739104 is your verification code for Opay. Do not share this code with anyone.' },
  { label: 'ham', text: "Good morning, please send the invoice for last week's supply of 20 bags of rice." },
  { label: 'ham', text: 'Your order #44812 has been shipped and will arrive on Thursday. Track it at https://www.jumia.com.ng/track' },
  { label: 'ham', text: 'Hi Tunde, the meeting is moved to 3pm. Please bring the samples.' },
  { label: 'ham', text: "Mummy, I've arrived safely in Abuja. I'll call you in the evening." },
  { label: 'ham', text: 'GTBank: Never share your PIN, OTP or password with anyone. GTBank will never ask for them.' },
  { label: 'ham', text: 'Customer, your data bundle of 2GB will expire in 3 days. Dial *131# to renew.' },
  { label: 'ham', text: "Please transfer the balance of ₦45,000 for the chairs to our Moniepoint account 6012345678 when you're ready." },
  { label: 'ham', text: 'Your NIN has been successfully linked to your MTN line. Thank you.' },
  { label: 'ham', text: 'Reminder: school fees for second term should be paid before 15th January. Pay at the bursary or via the school portal.' },
  { label: 'ham', text: 'We are hiring! Send your CV to careers@adaeze-foods.ng. Interviews hold next week at our Ikeja office.' },
  { label: 'ham', text: 'Hello sir, my POS machine is not printing. Can your technician come today?' },
  { label: 'ham', text: 'Congratulations on your new shop! Wishing you plenty customers.' },
  { label: 'ham', text: 'Kindly confirm receipt of the goods and the delivery fee of ₦3,000 paid to the rider.' },
  { label: 'ham', text: 'Abeg help me buy recharge card of 1k, I go pay you back tomorrow.' },
  { label: 'ham', text: 'Your Access Bank debit card ending 4421 expires next month. Visit any branch to pick up your new card.' },
  { label: 'ham', text: 'Join our church WhatsApp group for daily devotionals: https://chat.whatsapp.com/Gx81abc' },
  { label: 'ham', text: 'Team, please share the sales report with the managers group before 5pm.' },
  { label: 'ham', text: 'Thank you for your payment of ₦12,500 to DSTV. Your subscription is now active.' },
  { label: 'ham', text: "Hi, it's Chioma from the salon. Your hair appointment is confirmed for Saturday 10am." },
  { label: 'ham', text: 'The police station said we should come and write a statement about the stolen generator tomorrow.' },
  { label: 'ham', text: "Please don't share your OTP with anyone, even if they claim to be from our bank. — Kuda" },
  { label: 'ham', text: "Payment reminder: your rent of ₦600,000 is due on 1st April. Kindly pay into the landlord's usual account." },
];
