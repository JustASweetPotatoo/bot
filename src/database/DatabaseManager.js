import { configDotenv } from "dotenv";
import mysql from "mysql2/promise";

export default class DatabaseManager {
  constructor(client) {
    this.client = client;
    configDotenv();
    const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;
    this.pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
    });
  }

  async createConnection() {
    await this.createTable();
  }

  async createTable() {
    await this.executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) NOT NULL,
        xp BIGINT DEFAULT 0,
        level BIGINT DEFAULT 0,
        message_count BIGINT DEFAULT 0,
        achivement_id VARCHAR(64) NULL,
        PRIMARY KEY (id)
      );
    `);

    await this.executeQuery(`
        CREATE TABLE IF NOT EXISTS join_sessions (
          id VARCHAR(64) NOT NULL,
          join_timestamp VARCHAR(64),
          PRIMARY KEY (id)
        );
      `);
  }

  async executeQuery(query, values) {
    if (!this.pool) return [];
    const [rows] = await this.pool.query(query, values);
    return rows;
  }
}
