import { open } from "sqlite";
import sqlite3 from "sqlite3";
import * as path from "path";

import MossClient from "../Client.js";

export default class DatabaseManager {
  /**
   * @param {MossClient} client
   */
  constructor(client) {
    this.client = client;
  }

  createConnection = async () => {
    let err = null;

    await open({
      filename: path.join(this.client.__systemPath, "./database/database.db"),
      driver: sqlite3.Database,
    })
      .then(async (db) => {
        this.db = db;
        await this.createTable();
      })
      .catch((error) => {
        err = error;
      });

    if (err) console.log(err);

    return err;
  };

  createTable = async () => {
    await this.db.run(
      "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, xp NUMBER DEFAULT(0), level NUMBER DEFAULT(0), message_count NUMBER DEFAULT(0), achivement_id TEXT);"
    );
  };
}
