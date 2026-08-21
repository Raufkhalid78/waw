import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001'],

  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_key',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://waw_user:waw_password_2026@localhost:5432/waw_db',

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  TYPESENSE_HOST: process.env.TYPESENSE_HOST || 'localhost',
  TYPESENSE_PORT: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
  TYPESENSE_PROTOCOL: process.env.TYPESENSE_PROTOCOL || 'http',
  TYPESENSE_API_KEY: process.env.TYPESENSE_API_KEY || 'xyz123WawTypesenseSecretKey2026',

  SAFEPAY_API_KEY: process.env.SAFEPAY_API_KEY || 'sec_sandbox_test',
  SAFEPAY_SECRET_KEY: process.env.SAFEPAY_SECRET_KEY || 'sec_sandbox_secret',
  SAFEPAY_ENVIRONMENT: process.env.SAFEPAY_ENVIRONMENT || 'sandbox',

  PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID || '1000',
  PAYFAST_SECURED_KEY: process.env.PAYFAST_SECURED_KEY || 'test_key',

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID || '',

  FREE_DELIVERY_THRESHOLD_PKR: parseInt(process.env.FREE_DELIVERY_THRESHOLD_PKR || '5000', 10),
  DEFAULT_COD_FEE_PKR: parseInt(process.env.DEFAULT_COD_FEE_PKR || '100', 10),
  BASE_SHIPPING_FEE_PKR: parseInt(process.env.BASE_SHIPPING_FEE_PKR || '200', 10),
  DEFAULT_COMMISSION_PERCENTAGE: parseInt(process.env.DEFAULT_COMMISSION_PERCENTAGE || '10', 10),
};
