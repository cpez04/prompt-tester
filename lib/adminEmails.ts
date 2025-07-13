export function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  
  if (!adminEmailsEnv) {
    console.error('ADMIN_EMAILS environment variable not set');
    return [];
  }
  
  try {
    return adminEmailsEnv.split(',').map(email => email.trim()).filter(email => email.length > 0);
  } catch (error) {
    console.error('Error parsing ADMIN_EMAILS:', error);
    return [];
  }
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email);
}

// Backward compatibility - but this will be evaluated at module load
export const ADMIN_EMAILS = getAdminEmails();
