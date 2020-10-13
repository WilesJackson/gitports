import {flags} from '@oclif/command'
import Command from '../base';
import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import cli from 'cli-ux';
import * as pug from 'pug';
import * as path from 'path';
import * as fs from 'fs-extra';

const DEFAULT_PER_PAGE: number = 100;
const BASE_URI: string = 'https://api.github.com/repos';

export default class Issue extends Command {
  static description = 'Generate an Issue Report from Github';

  static flags = {
    help: flags.help({char: 'h'}),
    token: flags.string({ char: 't', description: 'GitHub Access Token for Private Repos' }),
    pages: flags.integer({ char: 'p', description: 'Number of Pages to Retrieve for GitHub Issues' }),
    label: flags.string({ char: 'l', description: 'Filter Issues by Label for Report'})
  };

  static args = [{name: 'repo'}];

  async run() {
    const {args, flags} = this.parse(Issue)
    let gToken: string = '';
    let confRepoOwner: string = '';
    if (this.configEntries > 0) {
      const { setupRun, repoOwner, gitToken } = this.conf;
      if (setupRun) {
        gToken = gitToken;
        confRepoOwner = repoOwner;
      } else {
        this.error('Please run GitPorts Setup before generating a report');
      }
    }
    const pageCount: number = (flags.pages && flags.pages > 1) ? flags.pages : 1;
    const repositoryName: string = args.repo;
    const userToken: string = (gToken && gToken.length > 0) 
      ? gToken
      : (flags.token && flags.token.length > 1)
        ? flags.token
        : '';
    if (!repositoryName || repositoryName.length < 1) {
      this.error('A Repository Name Must be Provided. Exiting.', { exit: -1 });
    } else {
      const filters: IFilter[] = [];
      if (flags.label && flags.label.length > 0) {
        let filterObj: IFilter = {
          name: 'labels',
          value: flags.label,
          queryVal: 'labels='
        };
        filters.push(filterObj);
      }
      cli.action.start('Fetching Issues: ' + repositoryName);
      const issues = await this.fetchIssues(repositoryName, confRepoOwner, filters, userToken, pageCount);
      if (issues.length > 0) {
        cli.action.stop();
        cli.action.start('Compiling');
        const issueItems: any[] = this.generateReportItems(issues);
        cli.action.stop();
        const reportCtx: any = {
          repo: repositoryName,
          allIssues: issueItems,
        };
        const templatePath = path.join(this.templateDir, 'report.jade');
        const template = pug.compileFile(templatePath);
        const render = template(reportCtx);
        const today: Date = new Date();
        const reportName: string = `gitports-${repositoryName}-${today.getTime()}.html`;
        cli.action.start('Exporting report');
        try {
          await fs.outputFile(path.join(this.outputDir, reportName), render);
        } catch (err) {
          this.error('Error creating report file.', { exit: -1 });
        }
        cli.action.stop('Exported to ' + path.join(this.outputDir, reportName));
      }
    }
  }

  async fetchIssues(repo: string, owner: string, filters: IFilter[], token: string = '', pages: number = 1): Promise<any[]> {
    const buildUrl: string = `${BASE_URI}/${owner}/${repo}/issues`;
    const pageCount: number = pages;
    const filterQueries: string[] = this.buildFilterQueries(filters);
    const issues: any[] = [];
    if (pageCount > 1) {
      for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
        const pageQuery: string = `page=${currentPage}&per_page=${DEFAULT_PER_PAGE}`;
        let filterQuery: string = '';
        let fetchUrl: string = `${buildUrl}?`;
        if (filterQueries.length > 0) {
          for (let i = 0; i < filterQueries.length; i++) {
            let query: string = filterQueries[i];
            filterQuery += query + '&';
          }
        }
        if (filterQuery.length > 0) {
          fetchUrl += filterQuery;
        }
        fetchUrl += pageQuery;
        const authHeaders: string = this.generateAuthHeaders(token);
        let getIssues = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Authorization': authHeaders
          }
        });
        let parsedIssues: any[] = await getIssues.json();
        if (parsedIssues.length > 0) {
          issues.push(...parsedIssues);
        } else if (parsedIssues.length < 1 && currentPage > 1) {
          break;
        }
      }
    } else {
      const pageQuery: string = 'page=1&per_page=100';
      let pageUrl: string = `${buildUrl}?`;
      let filterQuery: string = '';
      if (filterQueries.length > 0) {
        for (let i = 0; i < filterQueries.length; i++) {
          let query: string = filterQueries[i];
          filterQuery += query + '&';
        }
      }
      if (filterQuery.length > 0) {
        pageUrl += filterQuery;
      }
      pageUrl += pageQuery;
      const authHeaders: string = this.generateAuthHeaders(token);
      let singelPage = await fetch(pageUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeaders
        }
      });
      let spParsed: any[] = await singelPage.json();
      if (spParsed.length > 0) {
        issues.push(...spParsed);
      }
    }
    return issues;
  }

  buildFilterQueries(filters: IFilter[]): string[] {
    const queryStrings: string[] = [];
    if (filters && filters.length > 0) {
      filters.forEach((filter: IFilter) => {
        if (filter.name && filter.value && filter.queryVal) {
          queryStrings.push(`${filter.queryVal}${filter.value}`);
        }
      });
    }
    return queryStrings;
  }

  generateAuthHeaders(token: string): string {
    return `Basic ${Buffer.from(token + ':x-oauth-basic').toString('base64')}`;
  }

  generateReportItems(issues: any[]): any[] {
    const issueCount: number = issues.length;
    const reportIssues: any[] = [];
    for (let i = 0; i < issueCount; i++) {
      const issue = issues[i];
      const { html_url, number, title, user, labels, state, assignees, body } = issue;
      const reportIssue: any = {
        title,
        number,
        status: state,
        labels: [],
        assigned: [],
        created: '',
        url: html_url
      };
      if (labels.length > 0) {
        const labelNames: string[] = labels.map((label: any) => label.name);
        if (labelNames.length > 0) reportIssue['labels'] = labelNames;
      }
      if (user && user.login && user.login.length > 0) reportIssue['creator'] = user.login;
      if (assignees.length > 0) {
        const assignedTo: string[] = assignees.map((assign: any) => assign.login);
        if (assignedTo.length > 0) reportIssue['assigned'] = assignedTo;
      }
      reportIssues.push(reportIssue);
    }
    return reportIssues;
  }
}

interface IFilter {
  name: string;
  value: string;
  queryVal: string;
}