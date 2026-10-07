/** Indique si l'assurance complémentaire doit être proposée */
export function shouldOfferExtraInsurance(declaredValue: number | null | undefined): boolean {
  return declaredValue != null && declaredValue > 5000;
}
