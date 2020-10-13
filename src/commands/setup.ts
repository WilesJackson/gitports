import { flags } from '@oclif/command';
import Command from '../base';
import * as path from 'path';
import * as fs from 'fs-extra';

export default class Setup extends Command {
  static description = 'Setup Config for GitPorts'

  static flags = {
    help: flags.help({char: 'h'}),
    token: flags.string({ char: 't', description: 'GitHub Access Token to be stored in Config', required: true }),
    owner: flags.string({ char: 'o', description: 'Default Owner For Repos'})
  };

  async run() {
    const { flags } = this.parse(Setup);
    let currentConfig = this.conf;
    const sToken: string = (flags.token && flags.token.length > 0) ? flags.token : '';
    const sOwner: string = (flags.owner && flags.owner.length > 0) ? flags.owner : '';

    let confEntries: number = Object.keys(currentConfig).length;
    if (confEntries < 1) {
      currentConfig = {};
    }

    currentConfig.gitToken = sToken;
    currentConfig.repoOwner = sOwner;
    currentConfig.setupRun = true;

    const configFile: string = path.join(this.config.configDir, 'conf.json');
    if (sOwner || sToken) {
      try {
        await fs.writeJSON(configFile, currentConfig);
        console.log('Config Written!');
      } catch (err) {
        this.error('Error writing Config File.', { exit: -1 });
      }
    }
  }
}