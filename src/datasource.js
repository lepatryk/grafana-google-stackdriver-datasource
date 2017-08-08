import _ from 'lodash';
import moment from 'moment';
import scriptjs from './libs/script.js';
import dateMath from 'app/core/utils/datemath';

export class GoogleStackdriverDatasource {
  constructor(instanceSettings, $q, templateSrv) {
    this.type = instanceSettings.type;
    this.name = instanceSettings.name;
    this.clientId = instanceSettings.jsonData.clientId;
    this.scopes = [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/monitoring',
      'https://www.googleapis.com/auth/monitoring.read'
    ].join(' ');
    this.discoveryDocs = [ "https://monitoring.googleapis.com/$discovery/rest?version=v3" ];
    this.initialized = false;
    this.q = $q;
    this.templateSrv = templateSrv;
  }

  load() {
    let deferred = this.q.defer();
    scriptjs('https://apis.google.com/js/api.js', () => {
      gapi.load('client:auth2', () => {
        return deferred.resolve();
      });
    });
    return deferred.promise;
  }

  testDatasource() {
    return this.load().then(() => {
      return gapi.client.init({
        clientId: this.clientId,
        scope: this.scopes,
        discoveryDocs: this.discoveryDocs
      }).then(() => {
        return { status: 'success', message: 'Data source is working', title: 'Success' };
      });
    });
  }

  initialize() {
    if (this.initialized) {
      return Promise.resolve(gapi.auth2.getAuthInstance().currentUser.get());
    }

    return this.load().then(() => {
      return gapi.client.init({
        clientId: this.clientId,
        scope: this.scopes,
        discoveryDocs: this.discoveryDocs
      }).then(() => {
        let authInstance = gapi.auth2.getAuthInstance();
        if (!authInstance) {
          throw { message: 'failed to initialize' };
        }
        let isSignedIn = authInstance.isSignedIn.get();
        if (isSignedIn) {
          this.initialized = true;
          return authInstance.currentUser.get();
        }
        return authInstance.signIn().then(user => {
          this.initialized = true;
          return user;
        });
      }, err => {
        console.log(err);
        throw { message: 'failed to initialize' };
      });
    });
  }

  query(options) {
    return this.initialize().then(() => {
      return Promise.all(options.targets.map(target => {
        let params = {};
        params.name = 'projects/' + target.projectId;
        params.filter = target.filter;
        for (let key of Object.keys(target.aggregation)) {
          params['aggregation.' + key] = target.aggregation[key];
        }
        params['interval.startTime'] = this.convertTime(options.range.from, false);
        params['interval.endTime'] = this.convertTime(options.range.to, true);
        return gapi.client.monitoring.projects.timeSeries.list(params).then(response => {
          let r = JSON.parse(response.body);
          if (!r) {
            return {};
          }
          r.timeSeries.forEach(series => {
            series.target = target;
          });
          return r;
        });
      })).then(responses => {
        let timeSeries = _.flatten(responses.filter(response => {
          return !!response.timeSeries;
        }).map(response => {
          return response.timeSeries;
        }));
        return {
          data: timeSeries.map(series => {
            let aliasPattern = '{{resource.type}} - {{metric.type}}';
            if (series.target.alias) {
              aliasPattern = series.target.alias;
            }
            let metricLabel = this.getMetricLabel(aliasPattern, series);

            let datapoints = [];
            let valueKey = series.valueType.toLowerCase() + 'Value';
            for (let p of series.points) {
              datapoints.push([p.value[valueKey], Date.parse(p.interval.startTime).valueOf()]);
            }
            return { target: metricLabel, datapoints: datapoints };
          })
        };
      }, err => {
        err = JSON.parse(err.body);
        console.log(err);
        throw err.error;
      });
    });
  }

  metricFindQuery(query) {
    return '';
  }

  getFilterKeys() {
    return this.q.when([])
  }

  getFilterValues(key) {
    return this.q.when([])
  }

  getMetricLabel(aliasPattern, series) {
    let aliasRegex = /\{\{(.+?)\}\}/g;
    let aliasData = {
      metric: series.metric,
      resource: series.resource
    };
    let label = aliasPattern.replace(aliasRegex, (match, g1) => {
      let matchedValue = _.property(g1)(aliasData);
      if (matchedValue) {
        return matchedValue;
      }
      return g1;
    });
    return label;
  }

  convertTime(date, roundUp) {
    if (_.isString(date)) {
      date = dateMath.parse(date, roundUp);
    }
    return date.toISOString();
  };
}
