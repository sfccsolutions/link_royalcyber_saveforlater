'use strict';

var emailHelpers = require('app_storefront_base/cartridge/scripts/helpers/emailHelpers');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');
var ProductMgr = require('dw/catalog/ProductMgr');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');
var URLParameter = require('dw/web/URLParameter');

function backInStockEmail() {
    if (dw.system.Site.current.preferences.custom.rc_enableSaveForLater) {
        Transaction.wrap(function () {
            var coItr = CustomObjectMgr.getAllCustomObjects('rc_backInStockNotification');
            while (coItr.hasNext()) {
                var nextCO = coItr.next();
                if (ProductMgr.getProduct(nextCO.custom.rc_productID).getAvailabilityModel().isOrderable() && nextCO.custom.rc_notificationCount < 5) {
                    var emailObj = {
                        to: CustomerMgr.getCustomerByCustomerNumber(nextCO.custom.rc_customerNo).getProfile().getEmail(),
                        subject: Resource.msgf('subject.back.in.stock.email', 'jobs', null, ProductMgr.getProduct(nextCO.custom.rc_productID).getName()),
                        from: Site.current.getCustomPreferenceValue('customerServiceEmail') || 'no-reply@testorganization.com',
                        type: 0
                    };

                    var context = {
                        productName: ProductMgr.getProduct(nextCO.custom.rc_productID).getName(),
                        cartLink: URLUtils.abs("Cart-Show", 'fromEmail', true),
                        productLink: URLUtils.abs("Product-Show", 'pid', nextCO.custom.rc_productID)
                    };

                    emailHelpers.sendEmail(emailObj, 'mails/backInStockEmail', context);
                    nextCO.custom.rc_notificationCount += 1;
                }
            }
        })
    }
}

module.exports = {
    backInStockEmail: backInStockEmail
}