/* @name getEnums */
SELECT
  array_type.typname AS "arrayTypeName",
  array_type.oid :: integer AS "arrayTypeOid",
  elem_type.typname AS "typeName",
  elem_type.oid :: integer AS "typeOid"
FROM pg_type array_type
       JOIN pg_type elem_type ON array_type.typelem = elem_type.oid
       JOIN pg_namespace n ON elem_type.typnamespace = n.oid
WHERE elem_type.typtype = 'e'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND array_type.typcategory = 'A';
