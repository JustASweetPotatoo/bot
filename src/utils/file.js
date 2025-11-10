import { fileURLToPath } from "url";
import path from "path";

// tạo lại __dirname và __filename
const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

export default { _filename, _dirname };
