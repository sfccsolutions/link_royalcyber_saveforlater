"use strict";

var server = require('server');
server.extend(module.superModule);

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var productListHelper = require('*/cartridge/scripts/productListHelpers');
var saveForLaterProductlistType = dw.customer.ProductList.TYPE_CUSTOM_1;
var Resource = require('dw/web/Resource');

server.append('Show', function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');

    if (req.session.privacyCache.get('fromEmail') && dw.system.Site.current.preferences.custom.rc_enableSaveForLater) {
        res.redirect(URLUtils.url('Cart-Show'));
    }

    next();
});
server.prepend('Show', function (req, res, next) {
    var SavedForLaterModel = require('*/cartridge/models/productList');
    var PAGE_SIZE_ITEMS = 15;
    var config = {
        publicView: req.querystring.publicView || false,
        pageSize: PAGE_SIZE_ITEMS,
        pageNumber: req.querystring.pageNumber || 1
    };
    if (customer.authenticated && dw.system.Site.current.preferences.custom.rc_enableSaveForLater) {
        
        var savedForLaterList = productListHelper.getList(req.currentCustomer.raw, { type: saveForLaterProductlistType });
        var savedForLaterModel = new SavedForLaterModel(savedForLaterList, config).productList;
        var viewData = res.getViewData();
        viewData.savedForLaterModel = savedForLaterModel;
        res.setViewData(viewData);
    }
    next();
});
module.exports = server.exports();