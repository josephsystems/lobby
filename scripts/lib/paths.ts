import * as path from 'path';
import { CONFIG_FILENAME } from '../../src/shared/constants/config.constants';
import { PROJECT_ROOT } from '../../src/shared/utils/paths.util';

export const CONFIG_PATH = path.join(PROJECT_ROOT, CONFIG_FILENAME);
export const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'migrations');
