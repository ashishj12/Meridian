# Validation schema sources

Downloaded 24 October 2026. The schemas are vendored so normal operation performs no schema-network requests. Upstream schema files are retained without modification; original upstream notices and metadata remain authoritative. This project does not grant ownership of third-party standards.

- IATA AIDX official exchange page: https://www.iata.org/en/publications/info-data-exchange/
- IATA 21.3 schema archive: https://www.iata.org/contentassets/cfe998bcf9214859afda9c8bf4ff75c3/21.3-version-xml--api-standards---aidx.zip
- Published Smart Data Models ACRIS QueueMeasurement: https://raw.githubusercontent.com/smart-data-models/dataModel.ACRIS/master/QueueMeasurement/schema.json
- Common schema dependency: https://raw.githubusercontent.com/smart-data-models/data-models/master/common-schema.json

Only the AIDX schema files required by the notification schema and the two referenced JSON schemas are included. QueueMeasurement's upstream schema has an empty license metadata field; no certification or broader licensing claim is inferred from it.

`SHA256SUMS.txt` records the delivered files. Passing these schemas establishes syntactic/model validation for the supported messages, not IATA, ACI or vendor certification.
