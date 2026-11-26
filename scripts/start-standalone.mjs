import { prepareStandalone, startStandalone } from "./standalone.mjs";

await prepareStandalone();
startStandalone({
  hostname: process.env.HOSTNAME ?? "0.0.0.0",
  port: process.env.PORT ?? "3000",
});
