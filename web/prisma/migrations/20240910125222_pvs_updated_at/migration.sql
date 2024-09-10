CREATE TRIGGER "ProductVariantSerial_updatedAt"
  BEFORE UPDATE
  ON "ProductVariantSerial"
  FOR EACH ROW
EXECUTE PROCEDURE updated_at();
