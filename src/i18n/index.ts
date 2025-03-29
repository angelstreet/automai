export async function getMessages(locale: string) {
  try {
    return (await import(`./messages/${locale}.json`)).default;
  } catch (e) {
    throw new Error(`Failed to load messages for locale: ${locale}`, e);
  }
}
