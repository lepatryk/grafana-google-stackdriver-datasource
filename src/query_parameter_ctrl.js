import angular from 'angular';
import _ from 'lodash';

angular.module('grafana.directives').directive('googleStackdriverQueryParameter', () => {
  return {
    templateUrl: 'public/plugins/mtanda-google-stackdriver-datasource/partials/query.parameter.html',
    controller: 'GoogleStackdriverQueryParameterCtrl',
    restrict: 'E',
    scope: {
      target: "=",
      datasource: "=",
      onChange: "&",
    }
  };
});

angular.module('grafana.controllers').controller('GoogleStackdriverQueryParameterCtrl', ($scope, templateSrv, uiSegmentSrv, datasourceSrv, $q) => {
  $scope.init = function () {
    let target = $scope.target;
    target.projectId = target.projectId || '';
    target.filter = target.filter || '';
    target.aggregation = target.aggregation || {
      alignmentPeriod: '',
      perSeriesAligner: 'ALIGN_NONE',
      crossSeriesReducer: 'REDUCE_NONE'
    };
    target.alias = target.alias || '';

    $scope.perSeriesAlignerSegment = uiSegmentSrv.newSegment({value: 'aligner'});
    $scope.crossSeriesReducerSegment = uiSegmentSrv.newSegment({value: 'reducer'});

    if (!$scope.onChange) {
      $scope.onChange = function () { };
    }
  };

  $scope.getPerSeriesAligner = function () {
    return $q.when([
      'ALIGN_NONE',
      'ALIGN_DELTA',
      'ALIGN_RATE',
      'ALIGN_INTERPOLATE',
      'ALIGN_NEXT_OLDER',
      'ALIGN_MIN',
      'ALIGN_MAX',
      'ALIGN_MEAN',
      'ALIGN_COUNT',
      'ALIGN_SUM',
      'ALIGN_STDDEV',
      'ALIGN_COUNT_TRUE',
      'ALIGN_FRACTION_TRUE',
      'ALIGN_PERCENTILE_05',
      'ALIGN_PERCENTILE_50',
      'ALIGN_PERCENTILE_95',
      'ALIGN_PERCENTILE_99'
    ].map(v => {
      return uiSegmentSrv.newSegment({ value: v, expandable: false });
    }));
  };

  $scope.getCrossSeriesReducer = function () {
    return $q.when([
      'REDUCE_NONE',
      'REDUCE_MEAN',
      'REDUCE_MIN	',
      'REDUCE_MAX',
      'REDUCE_SUM',
      'REDUCE_STDDEV',
      'REDUCE_COUNT',
      'REDUCE_COUNT_TRUE',
      'REDUCE_FRACTION_TRUE',
      'REDUCE_PERCENTILE_05',
      'REDUCE_PERCENTILE_50',
      'REDUCE_PERCENTILE_95',
      'REDUCE_PERCENTILE_99',
    ].map(v => {
      return uiSegmentSrv.newSegment({ value: v, expandable: false });
    }));
  };

  $scope.alignerChanged = function () {
    $scope.target.aggregation.perSeriesAligner = $scope.perSeriesAlignerSegment.value;
    $scope.onChange();
  };

  $scope.reducerChanged = function () {
    $scope.target.aggregation.crossSeriesReducer = $scope.crossSeriesReducerSegment.value;
    $scope.onChange();
  };

  $scope.init();
});
