export function formatBOB(amount: number): string {
  return 'Bs. ' + amount.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
