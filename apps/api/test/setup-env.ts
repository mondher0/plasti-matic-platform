// Points the e2e suite at the dedicated `plastimatic_test` database instead
// of the dev one — must run before AppModule's ConfigModule.forRoot() reads
// process.env, hence `setupFiles` (runs before the test framework loads).
import * as dotenv from 'dotenv';
import * as path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
