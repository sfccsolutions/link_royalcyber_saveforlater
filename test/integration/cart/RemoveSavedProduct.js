var assert = require('chai').assert;
var request = require('request-promise');
var config = require('../it.config');
var chai = require('chai');
var chaiSubset = require('chai-subset');
var cookieJar = request.jar();
chai.use(chaiSubset);

describe('Cart RemoveSavedProduct from Saved Cart product', function () {
    this.timeout(5000);
    var pid = '701644329402M';

    beforeEach(function () {
        var myRequest = {
            url: config.baseUrl + '/Cart-SaveProduct',
            method: 'GET',
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            jar: cookieJar,
            form: {
                pid: pid,
                optionId: null,
                optionVal: null
            },
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        return request(myRequest)
            .then(function (response1) {
                assert.equal(response1.statusCode, 200);
            });
    });

    it('should be able to remove the last item in Save for later Cart', function () {
        var myRequest2 = {
            url: config.baseUrl + '/Cart-RemoveSavedProduct?pid=' + pid,
            method: 'GET',
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            jar: cookieJar,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        return request(myRequest2)
            .then(function (response2) {
                assert.equal(response2.statusCode, 200);
                var bodyAsJson = JSON.parse(response2.body);
                assert.isTrue(bodyAsJson.success);
                assert.equal(bodyAsJson.action, 'Cart-RemoveSavedProduct');
                assert.equal(bodyAsJson.queryString, 'pid=' + pid);
            });
    });
});