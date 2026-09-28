export default function formatBalance(balance: number | undefined | null) {
  return balance ? new Intl.NumberFormat("id-ID").format(balance) : null;
}
