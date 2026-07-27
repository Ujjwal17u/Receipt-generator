import { numberToWords } from "../utils/amount-to-words.js";

export const AmountToWordsService = {
  convert(amount, currency = "INR") {
    return numberToWords(amount, currency);
  },
};

export default AmountToWordsService;
