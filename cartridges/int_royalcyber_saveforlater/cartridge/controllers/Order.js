'use strict';

/**
 * @namespace Order
 */

var server = require('server');
server.extend(module.superModule);

server.append('Confirm', function (req, res, next) {
    var collections = require('*/cartridge/scripts/util/collections');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');
    var OrderMgr = require('dw/order/OrderMgr');

    var orderID = res.getViewData().order.orderNumber;
    var order = OrderMgr.getOrder(orderID,req.form.orderToken);
    
    if (customer.authenticated && dw.system.Site.current.preferences.custom.rc_enableSaveForLater) {
        collections.forEach(order.getAllProductLineItems(), function (productLineItem) {
            Transaction.wrap(function () {
                var rc_backInStockNotification_key = productLineItem.getProductID() + customer.getProfile().getCustomerNo();
                var coItr = CustomObjectMgr.getAllCustomObjects('rc_backInStockNotification');
                while (coItr.hasNext()) {
                var nextCO = coItr.next();
                if (nextCO.custom.rc_ID == rc_backInStockNotification_key) {
                    nextCO.custom.rc_markAsDelete = true;
                }
            }
            })
        });
    }

    next();
});

module.exports = server.exports();