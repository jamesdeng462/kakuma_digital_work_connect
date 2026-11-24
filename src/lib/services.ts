// External service adapters (SRS 2.4 co-existing software).
// In this prototype they are MOCK / SANDBOX implementations behind a stable interface,
// so each can be swapped for the real integration (UNHCR ProGres, Twilio, M-Pesa Daraja,
// OpenAI, IPFS) without changing any page code.

export const MOCK_OTP = "123456";
export const PLATFORM_FEE = 0.05; // 5% - SRS sequence diagram

/** UNHCR ProGres v4 - mock lookup. Accepts IDs formatted KAK-######. */
export function progresVerify(unhcrId: string): { ok: boolean; message: string } {
  const ok = /^KAK-\d{6}$/i.test(unhcrId.trim());
  return ok
    ? { ok: true, message: "Match found in UNHCR ProGres (sandbox). Identity verified." }
    : { ok: false, message: "No match found. Check the number (format KAK-123456) or choose another verification method." };
}

/** Twilio SMS OTP - mock. The code is always 123456 in the sandbox. */
export function sendOtp(phone: string): { sent: boolean; hint: string } {
  return { sent: phone.replace(/\D/g, "").length >= 9, hint: `Sandbox: use code ${MOCK_OTP}` };
}
export function checkOtp(code: string) {
  return code.trim() === MOCK_OTP;
}

/** M-Pesa Daraja - mock B2C / C2B. Returns a transaction reference. */
export function mpesaTransfer(amount: number): { ok: boolean; ref: string } {
  return { ok: amount > 0, ref: "MP" + Math.floor(1000000 + Math.random() * 8999999) };
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
