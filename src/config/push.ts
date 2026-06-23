// Web Push configuration.
// The VAPID PUBLIC key is safe to ship in the client bundle — only the matching
// PRIVATE key (stored as a Supabase Edge Function secret) can sign pushes.
//
// If you ever rotate the keypair, update this value AND the VAPID_PUBLIC_KEY /
// VAPID_PRIVATE_KEY secrets of the `send-push` edge function so they match.
export const VAPID_PUBLIC_KEY =
  "BHihtiSE_-lTRC17yClj20-yzTc1xKwWshmngOKJqXKrHmn3nay7xJ5c5gEverQhvRl8x-ECPX5f9wWufFYLn_Y";
