import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const folder = new URL(
  "../../../../fixtures/standards/acris/",
  import.meta.url,
);
const validator = new Ajv2020({ strict: false, allErrors: true });
addFormats(validator);
validator.addSchema(
  JSON.parse(fs.readFileSync(new URL("common-schema.json", folder), "utf8")),
);
const validateQueue = validator.compile(
  JSON.parse(
    fs.readFileSync(new URL("QueueMeasurement.schema.json", folder), "utf8"),
  ),
);
/** Validate the published ACRIS queue model after removing NGSI-LD Property wrappers. */
export function validateAcrisEntity(entity) {
  if (
    typeof entity.id !== "string" ||
    !entity.id.startsWith("urn:ngsi-ld:") ||
    !entity.type
  )
    throw new Error("NGSI-LD entity requires a URN id and type");
  for (const [key, value] of Object.entries(entity)) {
    if (key === "id" || key === "type" || key === "@context") continue;
    if (
      !value ||
      typeof value !== "object" ||
      !["Property", "Relationship"].includes(value.type)
    )
      throw new Error(`Invalid NGSI-LD attribute: ${key}`);
    if (value.type === "Property" && !("value" in value))
      throw new Error(`NGSI-LD Property ${key} requires value`);
    if (
      value.type === "Relationship" &&
      (!value.object || !value.object.startsWith("urn:ngsi-ld:"))
    )
      throw new Error(`NGSI-LD Relationship ${key} requires a URN object`);
  }
  const attributes = Object.fromEntries(
    Object.entries(entity).map(([key, value]) => [
      key,
      value?.type === "Property"
        ? value.value
        : value?.type === "Relationship"
          ? value.object
          : value,
    ]),
  );
  if (entity.type === "QueueMeasurement") {
    if (!validateQueue(attributes))
      throw new Error(
        "ACRIS queue schema validation failed: " +
          validator.errorsText(validateQueue.errors),
      );
    if (!Number.isFinite(attributes.Occupancy) || attributes.Occupancy < 0)
      throw new Error("ACRIS Occupancy must be non-negative");
    if (!Number.isFinite(Date.parse(attributes.MeasurementTimePeriod?.EndTime)))
      throw new Error("ACRIS MeasurementTimePeriod.EndTime required");
  }
  return attributes;
}
