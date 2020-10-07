import { Command } from '@oclif/command';
import * as fs from 'fs-extra';
import * as path from 'path';

export default abstract class extends Command {
  protected conf: any;
  protected outputDir: string = path.join(this.config.configDir, 'output');

  async init() {
    const configFile: string = path.join(this.config.configDir, 'conf.json');
    try {
      await fs.ensureFile(configFile);
      console.log('created config');
    } catch (err) {
      this.error('Error creating config for first run.', { exit: -1 });
    }

    try {
      const configObj: any = await fs.readJSON(configFile, { throws: false });
      if (configObj !== null) {
        this.conf = configObj;
        console.log('Read config');
      }
    } catch (err) {
      this.error('Could not retrieve config file.', { exit: -1 });
    }
  }
}