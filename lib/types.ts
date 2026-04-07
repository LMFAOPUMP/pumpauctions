export type BillboardRow = {
  id: string;
  buyer_wallet: string;
  image_url: string;
  tx_signature: string;
  paid_amount_tokens: number;
  paid_amount_raw: string;
  displayed_from: string;
  created_at: string;
};
