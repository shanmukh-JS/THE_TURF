import * as path from 'path'
import * as dotenv from 'dotenv'

const envPath = path.resolve(__dirname, '../.env.local')
dotenv.config({ path: envPath })
