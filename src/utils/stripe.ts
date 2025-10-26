import Stripe from 'stripe';
import getConfig from '../config/config';

const config = getConfig();
export const stripe = new Stripe(config.stripe.stripe_secret_key, {
  apiVersion: '2025-06-30.basil',
});
