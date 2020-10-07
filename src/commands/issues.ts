import { Command, flags } from '@oclif/command';

export default class Issues extends Command {
  static description = '';

  static args = [
    { name: 'repo', required: true, description: 'Repository Name as it exists in GitHub' }
  ];

  static flags = {
    token: flags.string({ char: 't', description: 'Provide GitHub account token' }),
    pages: flags.integer({ char: 'p', description: 'Number of Pages to get Issues from' }),
    label: flags.string({ char: 'l', description: 'Issue Label to Filter Issues on' })
  };

  static examples = [
    '$ gitports issues <REPOSITORY> -p 3 -l "current release"'
  ];
}