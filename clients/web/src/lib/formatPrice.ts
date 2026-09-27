export default function formatBalance(balance: number) {
  return new Intl.NumberFormat("id-ID").format(balance);
}
