/**
 * Error con código traducible. El proceso principal y la interfaz lo usan para que el mensaje
 * se muestre en el idioma elegido (la interfaz busca `errors.<code>` en su diccionario).
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public fatal = false,
    public params: Record<string, string> = {},
  ) {
    super(code);
  }
}
