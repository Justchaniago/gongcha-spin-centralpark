// In-memory IP tracking cache for velocity throttling
interface IpVelocityRecord {
  lastAttemptTimestamp: number;
}

const ipVelocityCache = new Map<string, IpVelocityRecord>();

// Minimum seconds gap between registrations from the exact same IP
const COOLDOWN_SECONDS = 10;

// Top disposable / burner email domains commonly used by automated bots
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "sharklasers.com",
  "grr.la",
  "tempmail.com",
  "10minutemail.com",
  "throwawaymail.com",
  "getnada.com",
  "trashmail.com",
  "yopmail.com",
  "dispostable.com",
  "fakeinbox.com",
  "mytemp.email",
  "mohmal.com",
  "burnermail.io",
]);

export function checkDisposableEmail(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.trim().toLowerCase().split("@")[1];
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

export function checkIpVelocity(ip: string): {
  allowed: boolean;
  cooldownRemaining: number;
} {
  if (!ip || ip === "unknown" || ip === "127.0.0.1") {
    return { allowed: true, cooldownRemaining: 0 };
  }

  const now = Date.now();
  const record = ipVelocityCache.get(ip);

  if (record) {
    const elapsedSeconds = Math.floor((now - record.lastAttemptTimestamp) / 1000);
    if (elapsedSeconds < COOLDOWN_SECONDS) {
      return {
        allowed: false,
        cooldownRemaining: COOLDOWN_SECONDS - elapsedSeconds,
      };
    }
  }

  // Update last attempt
  ipVelocityCache.set(ip, { lastAttemptTimestamp: now });

  // Prevent memory leak by cleaning up records older than 5 minutes
  if (ipVelocityCache.size > 2000) {
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    for (const [key, value] of ipVelocityCache.entries()) {
      if (value.lastAttemptTimestamp < fiveMinutesAgo) {
        ipVelocityCache.delete(key);
      }
    }
  }

  return { allowed: true, cooldownRemaining: 0 };
}
