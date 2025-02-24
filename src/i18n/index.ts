export async function getMessages(locale: string) {
  try {
    return (await import(`../messages/${locale}.json`)).default;
  } catch (error) {
    throw new Error(`Failed to load messages for locale: ${locale}`);
  }
}
