import {Command, flags} from '@oclif/command'
import fetch from 'node-fetch';
import { Buffer } from 'buffer';

const DEFAULT_PER_PAGE: number = 100;
const DEFAULT_REPO_OWNER: string = 'wilesjackson';
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
    const pageCount: number = (flags.pages && flags.pages > 1) ? flags.pages : 1;
    const repositoryName: string = args.repo;
    const userToken: string = (flags.token && flags.token.length > 1) ? flags.token : '';
    if (!repositoryName || repositoryName.length < 1) {
      this.error('A Repository Name Must be Provided. Exiting.', { exit: -1 });
    } else {
      const filters: IFilter[] = [];
      if (flags.label && flags.label.length > 0) {
        let filterObj: IFilter = {
          name: 'labels',
          value: flags.label,
          queryVal: 'filter='
        };
        filters.push(filterObj);
      }
      await this.fetchIssues(repositoryName, DEFAULT_REPO_OWNER, filters, userToken, pageCount);
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
          console.log(filterQuery);
        }
        if (filterQuery.length > 0) {
          fetchUrl += filterQuery;
        }
        fetchUrl += pageQuery;
        console.log(fetchUrl);
        const authHeaders: string = this.generateAuthHeaders(token);
        let getIssues = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Authorization': authHeaders
          }
        });
        let parsedIssues: any[] = await getIssues.json();
        console.log(typeof parsedIssues);
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
      console.log(pageUrl);
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
}

interface IFilter {
  name: string;
  value: string;
  queryVal: string;
}