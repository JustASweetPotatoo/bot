import MossClient from "../Client.js";

export default class UserService {
  /**
   *
   * @param {MossClient} client
   */
  constructor(client) {
    this.client = client;

    client.on("clientReady", () => {
      this.connection = client.databaseManager;
    });
  }

  /**
   *
   * @param {string} id
   * @returns {Promise<{id: string, xp: number, level: number, message_count: number, achivement_id: string} | undefined>}
   */
  get = async (id) => {
    return (
      await this.connection.executeQuery("SELECT * FROM users WHERE id = ?;", [id])
    ).at(0);
  };

  /**
   *
   * @param {string} id
   * @returns {Promise<{id: string, xp: number, level: number, message_count: number, achivement_id: string} | null>}
   */
  getRankOrderByXp = async (id) => {
    return await this.connection.executeQuery(
      `
        SELECT 
          u.*,
          (
            SELECT COUNT(*) + 1
            FROM users
            WHERE xp > u.xp
          ) AS \`rank\`
        FROM users u
        WHERE u.id = ?;
        `,
      [id]
    );
  };

  /**
   *
   * @returns {Promise<[{id: string, xp: number, level: number, message_count: number, achivement_id: string}] | null>}
   */
  getAll = async () => await this.connection.executeQuery("SELECT * FROM users;");

  async getAllOrderByXp() {
    return await this.connection.executeQuery(
      "ECT * FROM users ORDER BY xp DESC LIMIT 10;"
    );
  }

  /**
   *
   * @param {{id: string, xp: number, level: number, message_count: number, achivement_id: string}} userData
   */
  insert = async (userData) =>
    await this.connection.executeQuery(
      `
        INSERT INTO users (id, xp, level, message_count, achivement_id) 
        VALUES (?, ?, ?, ?, ?) AS new
        ON DUPLICATE KEY UPDATE 
            xp = new.xp, 
            level = new.level, 
            message_count = new.message_count,
            achivement_id = new.achivement_id;
      `,
      [
        userData.id,
        Number.isNaN(userData.xp) ? 0 : userData.xp,
        Number.isNaN(userData.level) ? 0 : userData.level,
        Number.isNaN(userData.message_count) ? 0 : userData.message_count,
        userData.achivement_id ?? null,
      ]
    );

  /**
   *
   * @param {}
   */
  create = async (userId) => {
    await this.connection.executeQuery(
      `
        INSERT INTO users (id, xp, level, message_count, achivement_id) 
        VALUES (?, ?, ?, ?, ?) AS new
        ON DUPLICATE KEY UPDATE 
            xp = new.xp, 
            level = new.level, 
            message_count = new.message_count,
            achivement_id = new.achivement_id;
      `,
      [userId, 0, 0, 0, null]
    );
  };
}
