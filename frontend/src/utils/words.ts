const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigit = (n: number): string => (n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : ''));
const threeDigit = (n: number): string => {
  const h = Math.floor(n / 100), r = n % 100;
  let res = '';
  if (h > 0) res += ones[h] + ' Hundred';
  if (r > 0) res += (res ? ' ' : '') + twoDigit(r);
  return res;
};

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  let result = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;
  if (crore > 0) result += twoDigit(crore) + ' Crore ';
  if (lakh > 0) result += twoDigit(lakh) + ' Lakh ';
  if (thousand > 0) result += twoDigit(thousand) + ' Thousand ';
  if (rest > 0) result += threeDigit(rest);
  return result.trim();
}

/** IRD requirement: total amount written in words */
export function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paisa = Math.round((amount - rupees) * 100);
  let words = numberToWords(rupees) + ' Rupees';
  if (paisa > 0) words += ' and ' + numberToWords(paisa) + ' Paisa';
  return words + ' Only';
}