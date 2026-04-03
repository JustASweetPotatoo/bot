import MossClient from "../Client.js";

export default class JoinSessionService {
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
   * @returns {{id: string, join_timestamp: string}}
   */
  async get(id) {
    const rows = await this.connection.executeQuery(
      `SELECT * FROM join_sessions WHERE id = ?`,
      [id]
    );
    return rows.at(0);
  }

  /**
   *
   * @returns {Promise<Array<{id: string, join_timestamp: string}>>}
   */
  async getAll() {
    return await this.connection.executeQuery(`SELECT * FROM join_sessions;`, []);
  }

  /**
   *
   * @param {{id: string, join_timestamp: string}} options
   */
  async create(options) {
    await this.connection.executeQuery(
      `
      INSERT INTO join_sessions (id, join_timestamp)
      VALUES(?, ?) AS new
      ON DUPLICATE KEY UPDATE
        join_timestamp = new.join_timestamp
      ;
    `,
      [options.id, options.join_timestamp]
    );
  }

  /**
   *
   * @param {string} id
   */
  async delete(id) {
    await this.connection.executeQuery(`DELETE FROM join_sessions WHERE id = ?`, [id]);
  }
}
