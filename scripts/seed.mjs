import { EntityRepository } from "../apps/api/src/repositories/EntityRepository.mjs";
import { seed } from "../apps/api/src/database/seed.mjs";
import "dotenv/config";

const s = new EntityRepository();
s.transaction(() => seed(s));
console.log(
  "Seeded 900 flights, 180 screens, 40 outlets, 10 airlines, 25 campaigns, 30 days history.",
);
s.close();
