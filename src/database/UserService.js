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
   * @returns {Promise<{id: string, xp: number, level: number, message_count: number, achivement_id: string} | null>}
   */
  get = async (id) => {
    return await this.db.get("SELECT * FROM users WHERE id = ?;", [id]);
  };

  /**
   *
   * @param {string} id
   * @returns {Promise<{id: string, xp: number, level: number, message_count: number, achivement_id: string} | null>}
   */
  getRankOrderByXp = async (id) => {
    return await this.db.get(
      `SELECT * FROM (
                        SELECT users.*, ROW_NUMBER() 
                        OVER (ORDER BY xp DESC) AS rank 
                        FROM users
                        ) 
          AS ranked 
          WHERE id = ? 
          LIMIT 10000;`,
      [id]
    );
  };

  /**
   *
   * @returns {Promise<[{id: string, xp: number, level: number, message_count: number, achivement_id: string}] | null>}
   */
  getAll = async () => await this.db.all("SELECT * FROM users;");

  /**
   *
   * @param {{id: string, xp: number, level: number, message_count: number, achivement_id: string}} userData
   */
  insert = async (userData) =>
    await this.db.run(
      `
        INSERT INTO users (id, xp, level, message_count, achivement_id) 
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE 
          SET 
            xp = excluded.xp, 
            level = excluded.level, 
            message_count = excluded.message_count,
            achivement_id = excluded.achivement_id
        ;`,
      [
        userData.id,
        userData.xp,
        userData.level,
        userData.message_count,
        userData.achivement_id,
      ]
    );

  /**
   *
   * @param {}
   */
  create = async (userId) => {
    await this.db.run(
      `
        INSERT INTO users (id, xp, level, message_count) 
        VALUES (?, ?, ?, ?, ?) 
        ON CONFLICT(id) DO UPDATE 
          SET 
            xp = excluded.xp, 
            level = excluded.level, 
            message_count = excluded.message_count
            ;`,
      [userId, 0, 0, 0]
    );
  };
}
