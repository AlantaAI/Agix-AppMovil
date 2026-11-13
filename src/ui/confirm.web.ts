/** En la vista previa web, `Alert` con botones no hace nada: se usa el diálogo del navegador. */
export function confirm(title: string, message: string, _okLabel: string, _destructive = false): Promise<boolean> {
  return Promise.resolve(globalThis.confirm(`${title}\n\n${message}`));
}
