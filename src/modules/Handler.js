import MossClient from "../Client.js";

export default class Handler {
  /**
   *
   * @param {{name: string, client: MossClient}} options
   */
  constructor(options) {
    this.name = options.name;
    this.client = options.client;
    this.logger = this.client.logger;
  }

  /**
   *
   * @param {Error} error
   */
  onError(error) {
    this.client.logger.writeLog(error);
  }
}
