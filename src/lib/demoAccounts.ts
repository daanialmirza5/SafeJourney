/** Client-safe constants (no Prisma import) so login UI can reference the
 * fixed demo accounts without pulling server-only code into the browser
 * bundle. Server code should prefer importing these via @/lib/config. */
export const DEMO_USER_EMAILS = {
  doctor: "doctor@demo.local",
  coordinator: "coordinator@demo.local",
  patient: "patient@demo.local",
  caregiver: "caregiver@demo.local",
  worker: "worker@demo.local",
  admin: "admin@demo.local",
} as const;

export const DEMO_PASSWORD = "demo1234";
