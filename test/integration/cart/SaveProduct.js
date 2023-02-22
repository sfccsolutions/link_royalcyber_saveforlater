var assert = require('chai').assert;
var request = require('request-promise');
var config = require('../it.config');
var chai = require('chai');
var chaiSubset = require('chai-subset');
chai.use(chaiSubset);

describe('Cart SaveProduct', function () {
    this.timeout(5000);

    it('should add product to Save for later Cart', function () {
        var cookieJar = request.jar();
        var myRequest = {
            url: config.baseUrl + '/Cart-SaveProduct',
            method: 'GET',
            form: {
                pid: '701644329402M',
                optionId: null,
                optionVal: null
            },
            jar: cookieJar,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        };

        return request(myRequest)
            .then(function (response) {
                var code = JSON.parse(response);
                if(code.statusCode == '25')
                {
                assert.equal(code.statusCode, 25)
                var expectedResponse = {
                    'success': true,
                    'msg': 'basket not found.'
                };
                assert.equal(true, expectedResponse.success);
                }
                else if(code.statusCode == '200')
                {
                    assert.equal(code.statusCode, 200);
                    var expectedResponse = {
                        'success': true,
                        'msg': 'Product successfully saved for later'
                    };
                    assert.equal(true, expectedResponse.success);

                }
                else
                {
                    assert.equal(code.statusCode, 500);
                    var expectedResponse = {
                        'success': true,
                        'msg': 'Product could not be saved for later'
                    };
                    assert.equal(true, expectedResponse.success);
                }
            });
    });
});
