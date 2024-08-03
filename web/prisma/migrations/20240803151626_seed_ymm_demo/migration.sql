-- This is an empty migration.

INSERT INTO "CustomFieldsPreset" (type, shop, name, keys, "default")
VALUES ('WORK_ORDER', '4477ab-9f.myshopify.com', 'YMM', ARRAY ['Year', 'Make', 'Model'], TRUE),
       ('PURCHASE_ORDER', '4477ab-9f.myshopify.com', 'YMM', ARRAY ['Year', 'Make', 'Model'], TRUE),
       ('LINE_ITEM', '4477ab-9f.myshopify.com', 'YMM', ARRAY ['Year', 'Make', 'Model'], TRUE);

INSERT INTO "CustomFieldValueOptions" (shop, name, values)
VALUES ('4477ab-9f.myshopify.com', 'Year', ARRAY ['2022', '2023', '2024']),
       ('4477ab-9f.myshopify.com', 'Make', ARRAY ['Tesla', 'BMW', 'Audi']),
       ('4477ab-9f.myshopify.com', 'Model',
        ARRAY ['Model S', 'Model X', 'Model 3', '5-series', '7-series', '8-series', 'X-series', 'M-series', 'A6', 'RS6', 'Q7', 'RS6']);
