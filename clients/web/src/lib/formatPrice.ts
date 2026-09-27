export default function formatBalance(balance: number | undefined) {
  return balance ? new Intl.NumberFormat("id-ID").format(balance) : null;
}
