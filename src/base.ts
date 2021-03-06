import { Command } from '@oclif/command';
import * as fs from 'fs-extra';
import * as path from 'path';

export default abstract class extends Command {
  protected conf: any = {};
  protected configEntries: number = 0;
  protected outputDir: string = path.join(this.config.configDir, 'output');
  protected templateDir: string = path.join(this.config.root, 'template');

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
        const entries: number = Object.keys(configObj).length;
        if (entries > 0) {
          this.conf = configObj;
          this.configEntries = entries;
        } else {
          await this.genDefaultConfig(configFile);
        }
      } else {
        await this.genDefaultConfig(configFile);
      }
    } catch (err) {
      this.error('Could not retrieve config file.', { exit: -1 });
    }
  }

  async genDefaultConfig(configFile: string) {
    const defaultConf: any = {
      setupRun: false
    };
    try {
      await fs.writeJSON(configFile, defaultConf);
      this.conf = defaultConf;
      this.configEntries = 1;
      console.log('Created Default Config');
    } catch (err) {
      this.error('Error Creating Default Config', { exit: -1 });
    }
  }
}