import MossClient from "./src/Client.js";
import { configDotenv } from "dotenv";

configDotenv();

const client = new MossClient();

client.join();
