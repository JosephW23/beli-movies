export function friendlyAuthError(message: string | null) {
  if (!message) return null;

  const msg = message.toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  if (msg.includes("already registered") || msg.includes("already exists")) {
    return "An account with this email already exists.";
  }

  if (msg.includes("email") && msg.includes("invalid")) {
    return "Please enter a valid email address.";
  }

  if (msg.includes("password")) {
    return "Password must be at least 6 characters.";
  }

  return "Something went wrong. Please try again.";
}
