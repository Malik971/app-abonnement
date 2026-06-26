/**
 * Utilitaires asynchrones.
 */

/**
 * Course une promesse contre un délai. Si la promesse n'a pas abouti dans
 * `ms` millisecondes, renvoie `fallback` au lieu de bloquer indéfiniment.
 *
 * Sert à protéger le démarrage de l'app : un appel réseau qui pend (Supabase
 * injoignable, token à rafraîchir sur une URL erronée…) ne doit jamais figer
 * l'écran de chargement.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise.then(
      (value) => {
        clearTimeout(timer);
        return value;
      },
      (error) => {
        clearTimeout(timer);
        throw error;
      },
    ),
    timeout,
  ]);
}
