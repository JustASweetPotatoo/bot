import MossClient from "../Client.js";

export default class UserService {
  /**
   *
   * @param {MossClient} client
   */
  constructor(client) {
    this.client = client;

    client.on("clientReady", () => {
      this.db = client.databaseManager.db;
    });
  }

  /**
   *
   * @param {string} id
   * @returns {Promise<{id: string, xp: number, level: number, message_count: number} | null>}
   */
  get = async (id) => await this.db.get("SELECT * FROM users WHERE id = ?;"[id]);

  /**
   *
   * @returns {Promise<[{id: string, xp: number, level: number, message_count: number}] | null>}
   */
  getAll = async () => await this.db.all("SELECT * FROM users;");

  /**
   *
   * @param {{id: string, xp: number, level: number, message_count: number}} user
   */
  insert = async (user) =>
    await this.db.run(
      "INSERT INTO users (id, xp, level, message_count) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET xp = excluded.xp, level = excluded.level, message_count = excluded.message_count;",
      [user.id, user.xp, user.level, user.message_count]
    );
}
