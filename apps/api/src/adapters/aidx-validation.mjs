import fs from "node:fs/promises";
import { validateXML } from "xmllint-wasm";
import { parseAidx } from "./aidx.adapter.mjs";

const schemaDirectory = new URL(
  "../../../../fixtures/standards/aidx/",
  import.meta.url,
);
let schemas;
/** Validate locally against the unmodified IATA 21.3 XSD bundle; never resolve remote XML entities. */
export async function validateAidxXml(xml) {
  parseAidx(xml); // Structural/size/DTD checks happen before entering the XML validator.
  schemas ??= Promise.all(
    (await fs.readdir(schemaDirectory))
      .filter((name) => name.endsWith(".xsd"))
      .map(async (fileName) => ({
        fileName,
        contents: await fs.readFile(new URL(fileName, schemaDirectory), "utf8"),
      })),
  );
  const files = await schemas;
  const main = files.find(
    (file) => file.fileName === "IATA_AIDX_FlightLegNotifRQ.xsd",
  );
  const result = await validateXML({
    xml: [{ fileName: "flight-event.xml", contents: xml }],
    schema: [main.contents],
    preload: files,
    maxMemoryPages: 2048,
  });
  if (!result.valid)
    throw new Error(
      "AIDX schema validation failed: " +
        result.errors.map((error) => error.message).join("; "),
    );
  return { valid: true, standard: "IATA AIDX", schemaVersion: "21.3" };
}
