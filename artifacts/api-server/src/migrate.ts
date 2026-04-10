import { pool } from "@workspace/db";

export async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("[migrate] Running startup migrations...");

    await client.query(`
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS api_secrets text;
    `);

    await client.query(`
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS notification_emails text;
    `);

    await client.query(`
      ALTER TABLE did_requests ADD COLUMN IF NOT EXISTS did_ids text;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'number_porting_requests' AND column_name = 'phone_number'
        ) THEN
          ALTER TABLE number_porting_requests RENAME COLUMN phone_number TO porting_numbers;
        END IF;
      END$$;
    `);

    await client.query(`
      ALTER TABLE number_porting_requests ADD COLUMN IF NOT EXISTS porting_numbers text;
    `);
    await client.query(`
      ALTER TABLE number_porting_requests ADD COLUMN IF NOT EXISTS contact_name text;
    `);
    await client.query(`
      ALTER TABLE number_porting_requests ADD COLUMN IF NOT EXISTS contact_email text;
    `);
    await client.query(`
      ALTER TABLE number_porting_requests ADD COLUMN IF NOT EXISTS contact_phone text;
    `);
    await client.query(`
      ALTER TABLE number_porting_requests ADD COLUMN IF NOT EXISTS porting_date date;
    `);
    await client.query(`
      ALTER TABLE number_porting_requests ADD COLUMN IF NOT EXISTS attachments text;
    `);

    await client.query(`
      ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS notification_recipients text;
    `);

    // coverage_check_requests: add extended address + contact fields
    await client.query(`
      ALTER TABLE coverage_check_requests ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'fibre';
    `);
    await client.query(`
      ALTER TABLE coverage_check_requests ADD COLUMN IF NOT EXISTS unit_street_number text;
    `);
    await client.query(`
      ALTER TABLE coverage_check_requests ADD COLUMN IF NOT EXISTS building_complex text;
    `);
    await client.query(`
      ALTER TABLE coverage_check_requests ADD COLUMN IF NOT EXISTS street_name text;
    `);
    await client.query(`
      ALTER TABLE coverage_check_requests ADD COLUMN IF NOT EXISTS address2 text;
    `);
    await client.query(`
      ALTER TABLE coverage_check_requests ADD COLUMN IF NOT EXISTS contact_name text;
    `);
    await client.query(`
      ALTER TABLE coverage_check_requests ADD COLUMN IF NOT EXISTS contact_email text;
    `);
    await client.query(`
      ALTER TABLE coverage_check_requests ADD COLUMN IF NOT EXISTS contact_phone text;
    `);

    // Normalize legacy empty-string phones to NULL before creating the unique index
    await client.query(`
      UPDATE resellers SET phone = NULL WHERE phone = '';
    `);

    // Enforce unique phone numbers on resellers (partial index allows multiple NULLs)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS resellers_phone_unique
      ON resellers (phone)
      WHERE phone IS NOT NULL;
    `);

    // Service credentials per order item (set by admin, viewed by reseller)
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_credentials (
        id SERIAL PRIMARY KEY,
        order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
        order_id INTEGER NOT NULL,
        reseller_id INTEGER NOT NULL,
        client_id INTEGER,
        service_name TEXT,
        username TEXT,
        password TEXT,
        host TEXT,
        port TEXT,
        extra_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS service_credentials_item_unique
      ON service_credentials (order_item_id);
    `);

    // Reseller activation flag on order items
    await client.query(`
      ALTER TABLE order_items
        ADD COLUMN IF NOT EXISTS is_activated BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // The following steps are development-only: they clean up fictive catalog data and
    // backfill the original demo catalog entries. In production the catalog starts empty
    // so the admin can populate it with real data.
    if (process.env.NODE_ENV !== "production") {
      // Step 1: Remove fictive catalog data (entries never requested by the user).
      // Tables with original entries keep ids <= their original max; fully fictive tables are emptied.
      await client.query(`
        DELETE FROM public.web_dev_items;
        DELETE FROM public.web_dev_categories;
        DELETE FROM public.data_security_items;
        DELETE FROM public.data_security_categories;
        DELETE FROM public.cybersecurity_items;
        DELETE FROM public.cybersecurity_categories;
        DELETE FROM public.services;
        DELETE FROM public.service_categories;
        DELETE FROM public.connectivity_items;
        DELETE FROM public.connectivity_categories;
        DELETE FROM public.voip_items WHERE id > 2;
        DELETE FROM public.voip_categories WHERE id > 2;
        DELETE FROM public.minute_bundles WHERE id > 1;
        DELETE FROM public.products WHERE id > 1;
        DELETE FROM public.product_categories WHERE id > 2;
        DELETE FROM public.web_hosting_packages WHERE id > 1;
        DELETE FROM public.domain_tlds WHERE id > 3;
      `);

      // Step 2: Backfill original catalog entries (ON CONFLICT DO NOTHING keeps existing rows).
      // This repairs any environment where the originals were accidentally deleted.
      await client.query(`
        INSERT INTO public.voip_categories (id, name, description, parent_id, sort_order, created_at)
          VALUES (1, 'Single Line', 'Single Line', NULL, 1, '2026-04-04 14:10:22.004653')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.voip_categories (id, name, description, parent_id, sort_order, created_at)
          VALUES (2, 'Hosted PBX Extension', 'Hosted PBX Extension', NULL, 2, '2026-04-04 14:10:22.004653')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.voip_items (id, category_id, name, description, price, retail_price_excl_vat, reseller_price_excl_vat, reseller_price_incl_vat, price_incl_vat, unit, status, sort_order, created_at)
          VALUES (1, 1, 'Single Line', 'Single Line', 60.00, 60.00, 35.00, 40.25, 69.00, 'month', 'active', 1, '2026-04-04 14:10:26.020152')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.voip_items (id, category_id, name, description, price, retail_price_excl_vat, reseller_price_excl_vat, reseller_price_incl_vat, price_incl_vat, unit, status, sort_order, created_at)
          VALUES (2, 2, 'Hosted PBX Extension', 'Hosted PBX Extension', 99.00, 99.00, 60.00, 69.00, 113.85, 'month', 'active', 2, '2026-04-04 14:10:26.020152')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.minute_bundles (id, name, description, minutes, retail_price_excl_vat, retail_price_incl_vat, reseller_price_excl_vat, reseller_price_incl_vat, status, sort_order, created_at)
          VALUES (1, '150 Minutes', '150 Minutes', 150, 90.00, 103.50, 80.00, 92.00, 'active', 1, '2026-04-04 14:11:14.763776')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.product_categories (id, name, description, parent_id, sort_order, created_at)
          VALUES (1, 'VoIP Hardware', 'VoIP Hardware', NULL, 1, '2026-04-04 14:11:03.039222')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.product_categories (id, name, description, parent_id, sort_order, created_at)
          VALUES (2, 'Cordless Phones', 'Cordless Phones', 1, 1, '2026-04-04 14:11:03.039222')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.products (id, category_id, name, description, sku, image_url, price, retail_price_excl_vat, reseller_price_excl_vat, reseller_price_incl_vat, price_incl_vat, stock_count, status, sort_order, created_at)
          VALUES (1, 2, 'Grandstream WP816', 'The Grandstream WP816 is a cordless Wi-Fi IP phone with dual-band 802.11a/b/g/n/ac/ax support, ideal for seamless mobility and communication. Featuring advanced antenna design and roaming support, it offers 6-hour talk time and HD voice with dual microphones for crystal-clear audio. Equipped with 2 SIP accounts, Bluetooth connectivity, push-to-talk, and a Type C USB port for fast charging, it''s perfect for portable telephony needs. The WP816 also includes a 1500mAh rechargeable battery, an emergency button, and a durable design to ensure reliable communication in any environment. Cordless WiFi 6 Phone.', 'WP816', '/objects/uploads/617fec9d-34ad-4e7a-b337-7106807e7f43.png', 1750.00, 1750.00, 1750.00, 2012.50, 2012.50, 0, 'active', 0, '2026-04-04 14:11:06.92569')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.web_hosting_packages (id, name, description, disk_space_gb, bandwidth_gb, email_accounts, databases, subdomains, ssl_included, retail_price_excl_vat, reseller_price_excl_vat, reseller_price_incl_vat, price_incl_vat, status, sort_order, created_at)
          VALUES (1, 'Starter', 'Starter web hosting', 5, 50, 10, 5, 5, true, 99.00, 99.00, 113.85, 113.85, 'active', 0, '2026-04-04 14:10:59.090181')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.domain_tlds (id, tld, description, registration_years, retail_price_excl_vat, price_incl_vat, reseller_price_excl_vat, reseller_price_incl_vat, status, sort_order, created_at)
          VALUES (1, '.co.za', 'co.za Domain Registration', 1, 99.00, 113.85, 99.00, 113.85, 'active', 1, '2026-04-04 14:11:10.900199')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.domain_tlds (id, tld, description, registration_years, retail_price_excl_vat, price_incl_vat, reseller_price_excl_vat, reseller_price_incl_vat, status, sort_order, created_at)
          VALUES (2, '.com', 'com Domain Registration', 1, 295.00, 339.25, 265.00, 304.75, 'active', 2, '2026-04-04 14:11:10.900199')
          ON CONFLICT DO NOTHING;
        INSERT INTO public.domain_tlds (id, tld, description, registration_years, retail_price_excl_vat, price_incl_vat, reseller_price_excl_vat, reseller_price_incl_vat, status, sort_order, created_at)
          VALUES (3, '.net', 'net Domain Registration', 1, 295.00, 339.25, 265.00, 304.75, 'active', 3, '2026-04-04 14:11:10.900199')
          ON CONFLICT DO NOTHING;
      `);

      // Step 3: Reset sequences to correct values after cleanup + backfill.
      await client.query(`
        SELECT setval('voip_categories_id_seq', 2, true);
        SELECT setval('voip_items_id_seq', 2, true);
        SELECT setval('minute_bundles_id_seq', 1, true);
        SELECT setval('product_categories_id_seq', 2, true);
        SELECT setval('products_id_seq', 1, true);
        SELECT setval('web_hosting_packages_id_seq', 1, true);
        SELECT setval('domain_tlds_id_seq', 3, true);
        SELECT setval('connectivity_categories_id_seq', 1, false);
        SELECT setval('connectivity_items_id_seq', 1, false);
        SELECT setval('service_categories_id_seq', 1, false);
        SELECT setval('services_id_seq', 1, false);
        SELECT setval('cybersecurity_categories_id_seq', 1, false);
        SELECT setval('cybersecurity_items_id_seq', 1, false);
        SELECT setval('data_security_categories_id_seq', 1, false);
        SELECT setval('data_security_items_id_seq', 1, false);
        SELECT setval('web_dev_categories_id_seq', 1, false);
        SELECT setval('web_dev_items_id_seq', 1, false);
      `);
    }

    console.log("[migrate] Migrations complete.");
  } catch (err) {
    console.error("[migrate] Migration error:", err);
  } finally {
    client.release();
  }
}
